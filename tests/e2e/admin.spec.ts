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
