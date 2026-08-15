import { test, expect } from "@playwright/test";

const routes = [
  ["home", "/"], ["shop", "/shop"], ["collections", "/collections"], ["signature collection", "/collections/signature"], ["product", "/products/meridian-frame-tote"], ["search", "/search?q=carry"], ["cart", "/cart"], ["checkout", "/checkout"], ["confirmation", "/order-confirmation"], ["account", "/account"], ["wishlist", "/wishlist"], ["journal", "/journal"], ["article", "/journal/the-shape-of-a-day"], ["about", "/about"], ["contact", "/contact"], ["not found", "/missing-release-route"],
] as const;

for (const [name, route] of routes) {
  test(`route renders: ${name}`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).not.toBeEmpty();
    await expect(page.locator("header")).toBeVisible();
  });
}

const responsiveRoutes = ["/", "/shop", "/products/meridian-frame-tote", "/cart", "/journal", "/contact", "/about", "/wishlist", "/collections/signature", "/search"] as const;
for (const [index, route] of responsiveRoutes.entries()) {
  test(`responsive layout ${index + 1}: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: index % 2 ? 390 : 1280, height: 900 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(index % 2 ? 410 : 1320);
  });
}

const contentRoutes = ["/", "/shop", "/collections", "/products/meridian-frame-tote", "/journal", "/journal/the-shape-of-a-day", "/about", "/contact", "/cart", "/checkout"] as const;
for (const [index, route] of contentRoutes.entries()) {
  test(`content and screenshot invariant ${index + 1}: ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    expect(await page.locator("main").innerText()).toMatch(/\S/);
    const screenshot = await page.screenshot({ type: "png" });
    expect(screenshot.byteLength).toBeGreaterThan(10_000);
  });
}

const securityCases = [
  ["health", async ({ request }: any) => { const response = await request.get("/health"); expect(response.status()).toBe(200); expect((await response.json()).status).toBe("ok"); }],
  ["readiness", async ({ request }: any) => { const response = await request.get("/ready"); expect([200, 503]).toContain(response.status()); }],
  ["catalog", async ({ request }: any) => { const response = await request.get("/api/catalog"); expect(response.status()).toBe(200); const body = await response.json(); expect(body.products.length).toBeGreaterThan(0); }],
  ["protected account", async ({ request }: any) => { const response = await request.get("/api/account"); expect(response.status()).toBe(401); }],
  ["protected order", async ({ request }: any) => { const response = await request.get("/api/orders/unknown"); expect(response.status()).toBe(401); }],
  ["invalid webhook signature", async ({ request }: any) => { const response = await request.post("/api/webhooks/payment", { data: { eventId: "evt-invalid", status: "successful" }, headers: { "x-webhook-signature": "0".repeat(64) } }); expect(response.status()).toBe(401); }],
  ["untrusted CORS", async ({ request }: any) => { const response = await request.get("/health", { headers: { origin: "https://untrusted.invalid" } }); expect(response.headers()["access-control-allow-origin"]).toBeUndefined(); }],
  ["oauth error", async ({ request }: any) => { const response = await request.get("/api/oauth/callback?error=oauth_error"); expect(response.status()).toBe(400); expect((await response.json()).error.code).toBe("OAUTH_FAILED"); }],
  ["storage traversal", async ({ request }: any) => { const response = await request.get("/storage/../secret"); expect([400, 404]).toContain(response.status()); }],
  ["unknown API", async ({ request }: any) => { const response = await request.get("/api/missing"); expect(response.status()).toBe(404); }],
] as const;
for (const [name, fn] of securityCases) test(`API security: ${name}`, fn);
