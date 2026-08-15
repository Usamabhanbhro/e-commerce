ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_productKey_catalog_products_productKey_fk" FOREIGN KEY ("productKey") REFERENCES "public"."catalog_products"("productKey") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productKey_catalog_products_productKey_fk" FOREIGN KEY ("productKey") REFERENCES "public"."catalog_products"("productKey") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_cart_lines" ADD CONSTRAINT "saved_cart_lines_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_cart_lines" ADD CONSTRAINT "saved_cart_lines_productKey_catalog_products_productKey_fk" FOREIGN KEY ("productKey") REFERENCES "public"."catalog_products"("productKey") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_productKey_catalog_products_productKey_fk" FOREIGN KEY ("productKey") REFERENCES "public"."catalog_products"("productKey") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_events_created_at_idx" ON "admin_audit_events" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "catalog_products_status_idx" ON "catalog_products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_adjustments_product_idx" ON "inventory_adjustments" USING btree ("productKey");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "payment_attempts_order_id_idx" ON "payment_attempts" USING btree ("orderId");--> statement-breakpoint
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_stock_nonnegative" CHECK ("catalog_products"."stock" >= 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unit_price_nonnegative" CHECK ("order_items"."unitPricePkr" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_money_nonnegative" CHECK ("orders"."subtotalPkr" >= 0 AND "orders"."shippingPkr" >= 0 AND "orders"."discountPkr" >= 0 AND "orders"."totalPkr" >= 0);--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_amount_nonnegative" CHECK ("payment_attempts"."amountPkr" >= 0);--> statement-breakpoint
ALTER TABLE "saved_cart_lines" ADD CONSTRAINT "saved_cart_quantity_positive" CHECK ("saved_cart_lines"."quantity" > 0);