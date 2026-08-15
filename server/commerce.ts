import crypto from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { catalogProducts, orderItems, orders, paymentAttempts, paymentWebhookEvents } from "../drizzle/schema";
import { findProduct, products } from "../client/src/lib/catalog";
import type { AddressInput, DemoOrder, DemoPayment, OrderLineInput } from "../shared/commerce";
import { getDb } from "./db";
import { createPaymentProvider, type DemoOutcome, type PaymentMethod, type PaymentStatus } from "./paymentProviders";
import { canTransitionInventory, canTransitionPayment } from "./orderState";
import { getStorefrontCatalog } from "./admin";

const memoryOrders = new Map<string, DemoOrder>();
const memoryPayments = new Map<string, DemoPayment>();
async function resolveProduct(productId: string) { const catalog = await getStorefrontCatalog(); const item = catalog.products.find((p) => p.id === productId || p.slug === productId) as ({ id: string; slug: string; name: string; pricePkr: number; stock: number; category: string; collection: string; description: string; images: string[]; tags: string[]; availability: "in-stock" | "low-stock" | "out-of-stock" } | undefined); if (!item) return undefined; const fallback = products.find((p) => p.id === item.id || p.slug === item.slug) ?? findProduct(item.slug); return { id: item.id, slug: item.slug, name: item.name, price: item.pricePkr, category: item.category, collection: item.collection, description: item.description, details: fallback?.details ?? [], images: item.images.length ? item.images : fallback?.images ?? [], variants: fallback?.variants ?? [{ label: "Edition", value: "Standard", available: item.stock > 0 }], tags: item.tags, availability: item.availability === "out-of-stock" ? "low-stock" : item.availability }; }
async function calculate(lines: Array<{ product: Awaited<ReturnType<typeof resolveProduct>>; quantity: number; variant?: string }>) {
  const resolved = lines.map(({ product, quantity, variant }) => {
    if (!product) throw new Error("One or more products are no longer available.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error(`Quantity is not available for ${product.name}.`);
    const selected = variant ? product.variants.find((item) => `${item.label}:${item.value}` === variant && item.available) : undefined;
    if (variant && !selected) throw new Error(`Selected variant is not available for ${product.name}.`);
    return { productId: product.id, productName: product.name, variant: selected ? `${selected.label}: ${selected.value}` : undefined, quantity, unitPricePkr: product.price, imageUrl: product.images[0] };
  });
  const subtotalPkr = resolved.reduce((sum, line) => sum + line.quantity * line.unitPricePkr, 0);
  const originalSubtotalPkr = lines.reduce((sum, line) => sum + (line.product?.price ?? 0) * line.quantity, 0);
  const shippingPkr = subtotalPkr >= 25000 ? 0 : 650;
  const discountPkr = Math.max(0, originalSubtotalPkr - subtotalPkr);
  return { resolved, subtotalPkr, shippingPkr, discountPkr, totalPkr: subtotalPkr + shippingPkr };
}

function toPayment(row: typeof paymentAttempts.$inferSelect): DemoPayment {
  return { id: String(row.id), orderId: String(row.orderId), provider: row.provider as PaymentMethod, amountPkr: row.amountPkr, status: row.status as PaymentStatus, referenceId: row.referenceId, idempotencyKey: row.idempotencyKey, message: row.status === "successful" ? "Demo payment authorised. No real payment information was collected or transmitted." : row.status === "failed" ? "Demo payment was declined. No money moved." : row.status === "cancelled" ? "Demo payment was cancelled. No money moved." : "Demo payment remains pending provider confirmation.", providerMetadata: (row.providerMetadata ?? {}) as Record<string, string>, createdAt: row.createdAt.getTime() };
}

async function transitionInventory(tx: any, orderId: number, target: "released" | "committed") {
  const currentRows = await tx.select({ inventoryStatus: orders.inventoryStatus }).from(orders).where(eq(orders.id, orderId)).limit(1);
  const current = currentRows[0]?.inventoryStatus;
  if (target === "released" && current === "reserved") {
    const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const line of lines) await tx.update(catalogProducts).set({ stock: sql`${catalogProducts.stock} + ${line.quantity}` }).where(eq(catalogProducts.productKey, line.productKey));
    await tx.update(orders).set({ inventoryStatus: "released" }).where(eq(orders.id, orderId));
  } else if (target === "committed" && current === "reserved") {
    await tx.update(orders).set({ inventoryStatus: "committed" }).where(eq(orders.id, orderId));
  }
}

export const CommerceService = {
  async createOrder(userId: string, email: string, lines: OrderLineInput[], address: AddressInput): Promise<DemoOrder> {
    if (!lines.length) throw new Error("Your bag is empty.");
    const pricing = await calculate(await Promise.all(lines.map(async (line) => ({ product: await resolveProduct(line.productId), quantity: line.quantity, variant: line.variantId }))));
    const db = await getDb();
    if (!db) {
      const orderNumber = `UB-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const order: DemoOrder = { id: orderNumber, orderNumber, userId, email, lines: pricing.resolved, address, subtotalPkr: pricing.subtotalPkr, shippingPkr: pricing.shippingPkr, discountPkr: pricing.discountPkr, totalPkr: pricing.totalPkr, paymentStatus: "pending", fulfillmentStatus: "pending", inventoryStatus: "reserved", demoMode: true, createdAt: Date.now() };
      memoryOrders.set(orderNumber, order); return order;
    }
    const result = await db.transaction(async (tx) => {
      for (const line of pricing.resolved) {
        const updated = await tx.update(catalogProducts).set({ stock: sql`${catalogProducts.stock} - ${line.quantity}` }).where(and(eq(catalogProducts.productKey, line.productId), eq(catalogProducts.status, "active"), sql`${catalogProducts.stock} >= ${line.quantity}`)).returning({ productKey: catalogProducts.productKey }); if (updated.length !== 1) throw new Error("One or more products went out of stock. Please review your bag.");
      }
      const orderNumber = `UB-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const [inserted] = await tx.insert(orders).values({ orderNumber, userId: Number(userId) || null, email, subtotalPkr: pricing.subtotalPkr, shippingPkr: pricing.shippingPkr, discountPkr: pricing.discountPkr, totalPkr: pricing.totalPkr, shippingAddress: address, paymentStatus: "pending", fulfillmentStatus: "pending", inventoryStatus: "reserved", demoMode: true }).returning({ id: orders.id });
      const id = Number(inserted?.id ?? 0);
      await tx.insert(orderItems).values(pricing.resolved.map((line) => ({ orderId: id, productKey: line.productId, productName: line.productName, variant: line.variant ?? null, quantity: line.quantity, unitPricePkr: line.unitPricePkr, imageUrl: line.imageUrl })));
      return { id, orderNumber };
    });
    return { id: result.orderNumber, orderNumber: result.orderNumber, userId, email, lines: pricing.resolved, address, subtotalPkr: pricing.subtotalPkr, shippingPkr: pricing.shippingPkr, discountPkr: pricing.discountPkr, totalPkr: pricing.totalPkr, paymentStatus: "pending", fulfillmentStatus: "pending", inventoryStatus: "reserved", demoMode: true, createdAt: Date.now() };
  },

  async createPayment(userId: string, orderId: string, method: PaymentMethod, idempotencyKey: string, outcome?: DemoOutcome): Promise<DemoPayment> {
    if (!idempotencyKey || idempotencyKey.length < 8) throw new Error("A valid idempotency key is required.");
    const db = await getDb();
    if (!db) {
      const previous = memoryPayments.get(idempotencyKey); if (previous) return previous;
      const order = memoryOrders.get(orderId); if (!order || order.userId !== userId) throw new Error("Order was not found for this account.");
      const provider = createPaymentProvider(method); const result = await provider.initializePayment({ orderId, amountPkr: order.totalPkr, idempotencyKey, outcome });
      const payment: DemoPayment = { id: result.referenceId, orderId, provider: method, amountPkr: order.totalPkr, status: result.status, referenceId: result.referenceId, idempotencyKey, message: result.message, providerMetadata: result.providerMetadata, createdAt: Date.now() };
      memoryPayments.set(idempotencyKey, payment); order.paymentStatus = result.status; if (result.status === "failed" || result.status === "cancelled") order.inventoryStatus = "released"; if (result.status === "successful") order.inventoryStatus = "committed"; return payment;
    }
    const existing = await db.select().from(paymentAttempts).where(eq(paymentAttempts.idempotencyKey, idempotencyKey)).limit(1); if (existing[0]) return toPayment(existing[0]);
    const orderRows = await db.select().from(orders).where(eq(orders.orderNumber, orderId)).limit(1); const order = orderRows[0]; if (!order || (order.userId != null && String(order.userId) !== userId)) throw new Error("Order was not found for this account.");
    const result = await createPaymentProvider(method).initializePayment({ orderId, amountPkr: order.totalPkr, idempotencyKey, outcome });
    return db.transaction(async (tx) => {
      const [inserted] = await tx.insert(paymentAttempts).values({ orderId: order.id, provider: method, amountPkr: order.totalPkr, status: result.status, referenceId: result.referenceId, idempotencyKey, providerMetadata: result.providerMetadata }).returning({ id: paymentAttempts.id });
      if (result.status === "successful") await transitionInventory(tx, order.id, "committed");
      if (result.status === "failed" || result.status === "cancelled") await transitionInventory(tx, order.id, "released");
      await tx.update(orders).set({ paymentStatus: result.status }).where(eq(orders.id, order.id));
      return { id: String(inserted?.id ?? 0), orderId, provider: method, amountPkr: order.totalPkr, status: result.status, referenceId: result.referenceId, idempotencyKey, message: result.message, providerMetadata: result.providerMetadata, createdAt: Date.now() };
    });
  },

  async processWebhook(payload: { eventId: string; orderId: string; referenceId: string; provider: PaymentMethod; status: PaymentStatus; amountPkr: number }) {
    const db = await getDb();
    if (!db) {
      const payment = Array.from(memoryPayments.values()).find((p) => p.orderId === payload.orderId && p.referenceId === payload.referenceId); if (!payment) throw new Error("Payment reference was not found.");
      if (payment.amountPkr !== payload.amountPkr) throw new Error("Webhook amount does not match the order.");
      if (!canTransitionPayment(payment.status, payload.status)) return { duplicate: true, status: payment.status };
      payment.status = payload.status; const order = memoryOrders.get(payload.orderId); if (order) { order.paymentStatus = payload.status; if (payload.status === "successful") order.inventoryStatus = "committed"; if (payload.status === "failed" || payload.status === "cancelled") order.inventoryStatus = "released"; }
      return { duplicate: false, status: payload.status };
    }
    return db.transaction(async (tx) => {
      const already = await tx.select().from(paymentWebhookEvents).where(eq(paymentWebhookEvents.eventId, payload.eventId)).limit(1); if (already[0]) return { duplicate: true, status: "replayed" };
      const payments = await tx.select().from(paymentAttempts).where(eq(paymentAttempts.referenceId, payload.referenceId)).limit(1); const payment = payments[0]; if (!payment) throw new Error("Payment reference was not found.");
      if (payment.amountPkr !== payload.amountPkr) throw new Error("Webhook amount does not match the order.");
      await tx.insert(paymentWebhookEvents).values({ eventId: payload.eventId, provider: payload.provider, payload });
      const next = canTransitionPayment(payment.status as PaymentStatus, payload.status) ? payload.status : payment.status;
      await tx.update(paymentAttempts).set({ status: next }).where(eq(paymentAttempts.id, payment.id));
      if (next === "successful") await transitionInventory(tx, payment.orderId, "committed");
      if (next === "failed" || next === "cancelled") await transitionInventory(tx, payment.orderId, "released");
      await tx.update(orders).set({ paymentStatus: next }).where(eq(orders.id, payment.orderId));
      return { duplicate: false, status: next };
    });
  },

  async getOrder(userId: string, orderId: string) {
    const memory = memoryOrders.get(orderId); if (memory && memory.userId === userId) return memory;
    const db = await getDb(); if (!db) return null;
    const rows = await db.select().from(orders).where(eq(orders.orderNumber, orderId)).limit(1); const row = rows[0]; if (!row || (row.userId != null && String(row.userId) !== userId)) return null;
    const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, row.id));
    return { id: row.orderNumber, orderNumber: row.orderNumber, userId, email: row.email, lines: lines.map((l) => ({ productId: l.productKey, productName: l.productName, variant: l.variant ?? undefined, quantity: l.quantity, unitPricePkr: l.unitPricePkr, imageUrl: l.imageUrl ?? "" })), address: row.shippingAddress as AddressInput, subtotalPkr: row.subtotalPkr, shippingPkr: row.shippingPkr, discountPkr: row.discountPkr, totalPkr: row.totalPkr, paymentStatus: row.paymentStatus as PaymentStatus, fulfillmentStatus: row.fulfillmentStatus as DemoOrder["fulfillmentStatus"], inventoryStatus: row.inventoryStatus as DemoOrder["inventoryStatus"], demoMode: true as const, createdAt: row.createdAt.getTime() };
  },
};
