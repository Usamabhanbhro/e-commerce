CREATE TABLE "admin_audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"actorUserId" varchar(191) NOT NULL,
	"actorRole" varchar(32) NOT NULL,
	"action" varchar(128) NOT NULL,
	"resource" varchar(64) NOT NULL,
	"resourceId" varchar(191),
	"changedFields" jsonb NOT NULL,
	"requestId" varchar(128),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"imageUrl" varchar(1000) NOT NULL,
	"title" varchar(255) NOT NULL,
	"subtitle" varchar(500),
	"ctaText" varchar(128),
	"destination" varchar(500) NOT NULL,
	"startAt" timestamp with time zone,
	"endAt" timestamp with time zone,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(191) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"imageUrl" varchar(1000),
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"discountType" varchar(32) NOT NULL,
	"discountValue" integer NOT NULL,
	"targetType" varchar(32) DEFAULT 'catalog' NOT NULL,
	"targetValue" varchar(191),
	"startAt" timestamp with time zone,
	"endAt" timestamp with time zone,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_collections" (
	"collectionKey" varchar(191) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"payload" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_products" (
	"productKey" varchar(191) PRIMARY KEY NOT NULL,
	"slug" varchar(191) NOT NULL,
	"name" varchar(255) NOT NULL,
	"pricePkr" integer NOT NULL,
	"stock" integer DEFAULT 20 NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"payload" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"label" varchar(64) NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"phone" varchar(64) NOT NULL,
	"line1" varchar(255) NOT NULL,
	"line2" varchar(255),
	"city" varchar(128) NOT NULL,
	"postalCode" varchar(32),
	"country" varchar(64) DEFAULT 'Pakistan' NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"productKey" varchar(191) NOT NULL,
	"previousQuantity" integer NOT NULL,
	"adjustment" integer NOT NULL,
	"resultingQuantity" integer NOT NULL,
	"reason" varchar(500) NOT NULL,
	"actorUserId" varchar(191) NOT NULL,
	"requestId" varchar(128),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"productKey" varchar(191) NOT NULL,
	"productName" varchar(255) NOT NULL,
	"variant" varchar(255),
	"quantity" integer NOT NULL,
	"unitPricePkr" integer NOT NULL,
	"imageUrl" varchar(1000)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderNumber" varchar(64) NOT NULL,
	"userId" integer,
	"email" varchar(255) NOT NULL,
	"subtotalPkr" integer NOT NULL,
	"shippingPkr" integer NOT NULL,
	"discountPkr" integer DEFAULT 0 NOT NULL,
	"totalPkr" integer NOT NULL,
	"shippingAddress" jsonb NOT NULL,
	"paymentStatus" varchar(32) DEFAULT 'pending' NOT NULL,
	"fulfillmentStatus" varchar(32) DEFAULT 'pending' NOT NULL,
	"inventoryStatus" varchar(32) DEFAULT 'reserved' NOT NULL,
	"demoMode" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"provider" varchar(64) NOT NULL,
	"amountPkr" integer NOT NULL,
	"status" varchar(32) NOT NULL,
	"referenceId" varchar(191) NOT NULL,
	"idempotencyKey" varchar(191) NOT NULL,
	"providerMetadata" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"eventId" varchar(191) NOT NULL,
	"provider" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_cart_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"productKey" varchar(191) NOT NULL,
	"variantKey" varchar(255) DEFAULT '' NOT NULL,
	"quantity" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(191) NOT NULL,
	"email" varchar(255),
	"name" varchar(255),
	"role" varchar(32) DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"productKey" varchar(191) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "admin_categories_slug_unique" ON "admin_categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_products_slug_unique" ON "catalog_products" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_orderNumber_unique" ON "orders" USING btree ("orderNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_idempotency_unique" ON "payment_attempts" USING btree ("idempotencyKey");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_webhook_events_event_unique" ON "payment_webhook_events" USING btree ("eventId");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_cart_line_unique" ON "saved_cart_lines" USING btree ("userId","productKey","variantKey");--> statement-breakpoint
CREATE UNIQUE INDEX "users_openId_unique" ON "users" USING btree ("openId");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_item_unique" ON "wishlist_items" USING btree ("userId","productKey");