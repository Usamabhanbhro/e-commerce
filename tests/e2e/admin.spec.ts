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
