import { boolean, check, index, integer, jsonb, pgTable, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
};

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 191 }).notNull(),
  email: varchar("email", { length: 255 }),
  name: varchar("name", { length: 255 }),
  role: varchar("role", { length: 32 }).notNull().default("user"),
  ...timestamps,
}, (table) => ({ openIdUnique: uniqueIndex("users_openId_unique").on(table.openId) }));

export const catalogCollections = pgTable("catalog_collections", {
  collectionKey: varchar("collectionKey", { length: 191 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  payload: jsonb("payload").notNull(),
  ...timestamps,
});

export const catalogProducts = pgTable("catalog_products", {
  productKey: varchar("productKey", { length: 191 }).primaryKey(),
  slug: varchar("slug", { length: 191 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  pricePkr: integer("pricePkr").notNull(),
  stock: integer("stock").notNull().default(20),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  payload: jsonb("payload").notNull(),
  ...timestamps,
}, (table) => ({
  slugUnique: uniqueIndex("catalog_products_slug_unique").on(table.slug),
  statusIndex: index("catalog_products_status_idx").on(table.status),
  stockNonnegative: check("catalog_products_stock_nonnegative", sql`${table.stock} >= 0`),
}));

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("orderNumber", { length: 64 }).notNull(),
  userId: integer("userId").references(() => users.id, { onDelete: "set null" }),
  email: varchar("email", { length: 255 }).notNull(),
  subtotalPkr: integer("subtotalPkr").notNull(),
  shippingPkr: integer("shippingPkr").notNull(),
  discountPkr: integer("discountPkr").notNull().default(0),
  totalPkr: integer("totalPkr").notNull(),
  shippingAddress: jsonb("shippingAddress").notNull(),
  paymentStatus: varchar("paymentStatus", { length: 32 }).notNull().default("pending"),
  fulfillmentStatus: varchar("fulfillmentStatus", { length: 32 }).notNull().default("pending"),
  inventoryStatus: varchar("inventoryStatus", { length: 32 }).notNull().default("reserved"),
  demoMode: boolean("demoMode").notNull().default(true),
  ...timestamps,
}, (table) => ({
  orderNumberUnique: uniqueIndex("orders_orderNumber_unique").on(table.orderNumber),
  createdAtIndex: index("orders_created_at_idx").on(table.createdAt),
  userIdIndex: index("orders_user_id_idx").on(table.userId),
  moneyNonnegative: check("orders_money_nonnegative", sql`${table.subtotalPkr} >= 0 AND ${table.shippingPkr} >= 0 AND ${table.discountPkr} >= 0 AND ${table.totalPkr} >= 0`),
}));

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productKey: varchar("productKey", { length: 191 }).notNull().references(() => catalogProducts.productKey),
  productName: varchar("productName", { length: 255 }).notNull(),
  variant: varchar("variant", { length: 255 }),
  quantity: integer("quantity").notNull(),
  unitPricePkr: integer("unitPricePkr").notNull(),
  imageUrl: varchar("imageUrl", { length: 1000 }),
}, (table) => ({
  orderIndex: index("order_items_order_id_idx").on(table.orderId),
  quantityPositive: check("order_items_quantity_positive", sql`${table.quantity} > 0`),
  unitPriceNonnegative: check("order_items_unit_price_nonnegative", sql`${table.unitPricePkr} >= 0`),
}));

export const paymentAttempts = pgTable("payment_attempts", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 64 }).notNull(),
  amountPkr: integer("amountPkr").notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  referenceId: varchar("referenceId", { length: 191 }).notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 191 }).notNull(),
  providerMetadata: jsonb("providerMetadata").notNull(),
  ...timestamps,
}, (table) => ({
  idempotencyUnique: uniqueIndex("payment_attempts_idempotency_unique").on(table.idempotencyKey),
  orderIdIndex: index("payment_attempts_order_id_idx").on(table.orderId),
  amountNonnegative: check("payment_attempts_amount_nonnegative", sql`${table.amountPkr} >= 0`),
}));

export const paymentWebhookEvents = pgTable("payment_webhook_events", {
  id: serial("id").primaryKey(),
  eventId: varchar("eventId", { length: 191 }).notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  payload: jsonb("payload").notNull(),
  ...timestamps,
}, (table) => ({ eventUnique: uniqueIndex("payment_webhook_events_event_unique").on(table.eventId) }));

export const savedCartLines = pgTable("saved_cart_lines", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  productKey: varchar("productKey", { length: 191 }).notNull().references(() => catalogProducts.productKey),
  variantKey: varchar("variantKey", { length: 255 }).notNull().default(""),
  quantity: integer("quantity").notNull(),
  ...timestamps,
}, (table) => ({
  lineUnique: uniqueIndex("saved_cart_line_unique").on(table.userId, table.productKey, table.variantKey),
  quantityPositive: check("saved_cart_quantity_positive", sql`${table.quantity} > 0`),
}));

export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  productKey: varchar("productKey", { length: 191 }).notNull().references(() => catalogProducts.productKey),
  ...timestamps,
}, (table) => ({ itemUnique: uniqueIndex("wishlist_item_unique").on(table.userId, table.productKey) }));

export const customerAddresses = pgTable("customer_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 64 }).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 64 }).notNull(),
  line1: varchar("line1", { length: 255 }).notNull(),
  line2: varchar("line2", { length: 255 }),
  city: varchar("city", { length: 128 }).notNull(),
  postalCode: varchar("postalCode", { length: 32 }),
  country: varchar("country", { length: 64 }).notNull().default("Pakistan"),
  isDefault: boolean("isDefault").notNull().default(false),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type CatalogProduct = typeof catalogProducts.$inferSelect;
export type Order = typeof orders.$inferSelect;

export const adminCategories = pgTable("admin_categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 191 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),
  imageUrl: varchar("imageUrl", { length: 1000 }),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  sortOrder: integer("sortOrder").notNull().default(0),
  ...timestamps,
}, (table) => ({ slugUnique: uniqueIndex("admin_categories_slug_unique").on(table.slug) }));

export const adminPromotions = pgTable("admin_promotions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),
  discountType: varchar("discountType", { length: 32 }).notNull(),
  discountValue: integer("discountValue").notNull(),
  targetType: varchar("targetType", { length: 32 }).notNull().default("catalog"),
  targetValue: varchar("targetValue", { length: 191 }),
  startAt: timestamp("startAt", { mode: "date", withTimezone: true }),
  endAt: timestamp("endAt", { mode: "date", withTimezone: true }),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  ...timestamps,
});

export const adminBanners = pgTable("admin_banners", {
  id: serial("id").primaryKey(),
  imageUrl: varchar("imageUrl", { length: 1000 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  subtitle: varchar("subtitle", { length: 500 }),
  ctaText: varchar("ctaText", { length: 128 }),
  destination: varchar("destination", { length: 500 }).notNull(),
  startAt: timestamp("startAt", { mode: "date", withTimezone: true }),
  endAt: timestamp("endAt", { mode: "date", withTimezone: true }),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  sortOrder: integer("sortOrder").notNull().default(0),
  ...timestamps,
});

export const inventoryAdjustments = pgTable("inventory_adjustments", {
  id: serial("id").primaryKey(),
  productKey: varchar("productKey", { length: 191 }).notNull().references(() => catalogProducts.productKey),
  previousQuantity: integer("previousQuantity").notNull(),
  adjustment: integer("adjustment").notNull(),
  resultingQuantity: integer("resultingQuantity").notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  actorUserId: varchar("actorUserId", { length: 191 }).notNull(),
  requestId: varchar("requestId", { length: 128 }),
  ...timestamps,
}, (table) => ({
  productIndex: index("inventory_adjustments_product_idx").on(table.productKey),
}));

export const adminAuditEvents = pgTable("admin_audit_events", {
  id: serial("id").primaryKey(),
  actorUserId: varchar("actorUserId", { length: 191 }).notNull(),
  actorRole: varchar("actorRole", { length: 32 }).notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  resource: varchar("resource", { length: 64 }).notNull(),
  resourceId: varchar("resourceId", { length: 191 }),
  changedFields: jsonb("changedFields").notNull(),
  requestId: varchar("requestId", { length: 128 }),
  ...timestamps,
}, (table) => ({
  createdAtIndex: index("admin_audit_events_created_at_idx").on(table.createdAt),
}));

export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
export type AdminCategory = typeof adminCategories.$inferSelect;
export type AdminPromotion = typeof adminPromotions.$inferSelect;
export type AdminBanner = typeof adminBanners.$inferSelect;
export type InventoryAdjustment = typeof inventoryAdjustments.$inferSelect;
export type AdminAuditEvent = typeof adminAuditEvents.$inferSelect;
