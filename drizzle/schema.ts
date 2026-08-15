import { boolean, datetime, int, json, mysqlTable, serial, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

const timestamps = { createdAt: datetime("createdAt", { mode: "date" }).notNull().default(new Date()), updatedAt: datetime("updatedAt", { mode: "date" }).notNull().default(new Date()).$onUpdateFn(() => new Date()) };

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 191 }).notNull(),
  email: varchar("email", { length: 255 }),
  name: varchar("name", { length: 255 }),
  role: varchar("role", { length: 32 }).notNull().default("user"),
  ...timestamps,
}, (table) => ({ openIdUnique: uniqueIndex("users_openId_unique").on(table.openId) }));

export const catalogCollections = mysqlTable("catalog_collections", {
  collectionKey: varchar("collectionKey", { length: 191 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  payload: json("payload").notNull(),
  ...timestamps,
});

export const catalogProducts = mysqlTable("catalog_products", {
  productKey: varchar("productKey", { length: 191 }).primaryKey(),
  slug: varchar("slug", { length: 191 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  pricePkr: int("pricePkr").notNull(),
  stock: int("stock").notNull().default(20),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  payload: json("payload").notNull(),
  ...timestamps,
}, (table) => ({ slugUnique: uniqueIndex("catalog_products_slug_unique").on(table.slug) }));

export const orders = mysqlTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("orderNumber", { length: 64 }).notNull(),
  userId: int("userId"),
  email: varchar("email", { length: 255 }).notNull(),
  subtotalPkr: int("subtotalPkr").notNull(),
  shippingPkr: int("shippingPkr").notNull(),
  discountPkr: int("discountPkr").notNull().default(0),
  totalPkr: int("totalPkr").notNull(),
  shippingAddress: json("shippingAddress").notNull(),
  paymentStatus: varchar("paymentStatus", { length: 32 }).notNull().default("pending"),
  fulfillmentStatus: varchar("fulfillmentStatus", { length: 32 }).notNull().default("pending"),
  inventoryStatus: varchar("inventoryStatus", { length: 32 }).notNull().default("reserved"),
  demoMode: boolean("demoMode").notNull().default(true),
  ...timestamps,
}, (table) => ({ orderNumberUnique: uniqueIndex("orders_orderNumber_unique").on(table.orderNumber) }));

export const orderItems = mysqlTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: int("orderId").notNull(),
  productKey: varchar("productKey", { length: 191 }).notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  variant: varchar("variant", { length: 255 }),
  quantity: int("quantity").notNull(),
  unitPricePkr: int("unitPricePkr").notNull(),
  imageUrl: varchar("imageUrl", { length: 1000 }),
});

export const paymentAttempts = mysqlTable("payment_attempts", {
  id: serial("id").primaryKey(),
  orderId: int("orderId").notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  amountPkr: int("amountPkr").notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  referenceId: varchar("referenceId", { length: 191 }).notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 191 }).notNull(),
  providerMetadata: json("providerMetadata").notNull(),
  ...timestamps,
}, (table) => ({ idempotencyUnique: uniqueIndex("payment_attempts_idempotency_unique").on(table.idempotencyKey) }));

export const paymentWebhookEvents = mysqlTable("payment_webhook_events", {
  id: serial("id").primaryKey(),
  eventId: varchar("eventId", { length: 191 }).notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  payload: json("payload").notNull(),
  ...timestamps,
}, (table) => ({ eventUnique: uniqueIndex("payment_webhook_events_event_unique").on(table.eventId) }));

export const savedCartLines = mysqlTable("saved_cart_lines", {
  id: serial("id").primaryKey(), userId: int("userId").notNull(), productKey: varchar("productKey", { length: 191 }).notNull(), variantKey: varchar("variantKey", { length: 255 }).notNull().default(""), quantity: int("quantity").notNull(), ...timestamps,
}, (table) => ({ lineUnique: uniqueIndex("saved_cart_line_unique").on(table.userId, table.productKey, table.variantKey) }));

export const wishlistItems = mysqlTable("wishlist_items", {
  id: serial("id").primaryKey(), userId: int("userId").notNull(), productKey: varchar("productKey", { length: 191 }).notNull(), ...timestamps,
}, (table) => ({ itemUnique: uniqueIndex("wishlist_item_unique").on(table.userId, table.productKey) }));

export const customerAddresses = mysqlTable("customer_addresses", {
  id: serial("id").primaryKey(), userId: int("userId").notNull(), label: varchar("label", { length: 64 }).notNull(), recipient: varchar("recipient", { length: 255 }).notNull(), phone: varchar("phone", { length: 64 }).notNull(), line1: varchar("line1", { length: 255 }).notNull(), line2: varchar("line2", { length: 255 }), city: varchar("city", { length: 128 }).notNull(), postalCode: varchar("postalCode", { length: 32 }), country: varchar("country", { length: 64 }).notNull().default("Pakistan"), isDefault: boolean("isDefault").notNull().default(false), ...timestamps,
});

export type User = typeof users.$inferSelect;
export type CatalogProduct = typeof catalogProducts.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
