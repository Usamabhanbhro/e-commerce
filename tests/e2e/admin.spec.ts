import { test, expect } from "@playwright/test";

test("merchant studio opens through the explicit local demo-owner path", async ({ page }) => {
  const login = await page.context().request.post("/api/admin/demo-login", { data: {} });
  expect(login.status()).toBe(200);
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Good morning/i })).toBeVisible();
  await expect(page.getByText("Active products")).toBeVisible();
  await expect(page.getByText("Demo-ready, server-aware.")).toBeVisible();
});

test("merchant studio exposes protected operational sections after sign-in", async ({ page }) => {
  const login = await page.context().request.post("/api/admin/demo-login", { data: {} });
  expect(login.status()).toBe(200);
  for (const [route, heading] of [["products", "Products"], ["inventory", "Inventory"], ["promotions", "Promotions"], ["banners", "Banners"], ["settings", "Settings"]] as const) {
    await page.goto(`/admin/${route}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});

test("promotion mutations are validated and reflected in the public catalog", async ({ page }) => {
  const login = await page.context().request.post("/api/admin/demo-login", { data: {} });
  expect(login.status()).toBe(200);
  const invalid = await page.context().request.post("/api/admin/promotions", { data: { name: "Invalid", discountType: "percentage", discountValue: 20, targetType: "category", targetValue: "missing-category", status: "active" } });
  expect(invalid.status()).toBe(400);
  const created = await page.context().request.post("/api/admin/promotions", { data: { name: `E2E ${Date.now()}`, description: "Automated validation campaign", discountType: "percentage", discountValue: 10, targetType: "catalog", targetValue: "", status: "active", startAt: null, endAt: null } });
  expect(created.status()).toBe(201);
  const catalog = await page.context().request.get("/api/catalog");
  expect(catalog.status()).toBe(200);
  const payload = await catalog.json();
  expect(payload.products.some((product: { promotion: unknown }) => product.promotion !== null)).toBe(true);
});


test("category and inventory workflows expose safe merchant mutations", async ({ page }) => {
  const login = await page.context().request.post("/api/admin/demo-login", { data: {} });
  expect(login.status()).toBe(200);
  const slug = `e2e-category-${Date.now()}`;
  const created = await page.context().request.post("/api/admin/categories", { data: { slug, name: "E2E Category", description: "Test category", imageUrl: "https://example.com/category.webp", status: "active", sortOrder: 10 } });
  expect(created.status()).toBe(201);
  const category = await created.json();
  const updated = await page.context().request.patch(`/api/admin/categories/${category.item.id}`, { data: { description: "Updated category" } });
  expect(updated.status()).toBe(200);
  const inventory = await page.context().request.get("/api/admin/inventory");
  expect(inventory.status()).toBe(200);
  const inventoryPayload = await inventory.json();
  const productKey = inventoryPayload.items[0]?.id;
  expect(productKey).toBeTruthy();
  const adjustment = await page.context().request.post("/api/admin/inventory/adjust", { data: { productKey, adjustment: 2, reason: "E2E receiving" } });
  expect(adjustment.status()).toBe(200);
  const after = await page.context().request.get("/api/admin/inventory");
  expect((await after.json()).history.some((entry: { reason: string }) => entry.reason === "E2E receiving")).toBe(true);
});

test("audit filters and bounded pagination remain available to owners", async ({ page }) => {
  const login = await page.context().request.post("/api/admin/demo-login", { data: {} });
  expect(login.status()).toBe(200);
  const audit = await page.context().request.get("/api/admin/audit?limit=1&offset=0&resource=category");
  expect(audit.status()).toBe(200);
  const payload = await audit.json();
  expect(payload.pagination.limit).toBe(1);
  expect(Array.isArray(payload.items)).toBe(true);
  expect(payload.items.every((entry: { resource: string }) => entry.resource === "category")).toBe(true);
});

test("staff role mutations stay persistence-gated in demo mode", async ({ page }) => {
  const login = await page.context().request.post("/api/admin/demo-login", { data: {} });
  expect(login.status()).toBe(200);
  const staff = await page.context().request.get("/api/admin/staff");
  expect(staff.status()).toBe(200);
  const owner = (await staff.json()).items.find((item: { role: string }) => item.role === "owner");
  expect(owner).toBeTruthy();
  const ownerPatch = await page.context().request.patch(`/api/admin/staff/${owner.id}`, { data: { role: "admin" } });
  expect(ownerPatch.status()).toBe(404);
});
