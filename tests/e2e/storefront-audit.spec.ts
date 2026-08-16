import { expect, test } from "@playwright/test";

const routes = ["/", "/shop", "/collections", "/products/meridian-frame-tote", "/search", "/cart", "/journal", "/about", "/contact", "/faq", "/privacy", "/terms", "/shipping-returns", "/missing-route"];

async function dismissCookie(page: import("@playwright/test").Page) {
  const continueButton = page.getByRole("button", { name: "Continue", exact: true });
  if (await continueButton.isVisible().catch(() => false)) await continueButton.click();
}

test.describe("customer-facing storefront hardening", () => {
  test("renders representative routes with headings and no horizontal overflow", async ({ page }) => {
    test.setTimeout(120000);
    for (const width of [360, 390, 768, 1280, 1728]) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
      for (const route of routes) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await dismissCookie(page);
        await expect(page.locator("main#main-content")).toBeVisible();
        await expect(page.locator("h1").first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
      }
    }
  });

  test("supports keyboard skip navigation and the mobile menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });
    await dismissCookie(page);
    await page.locator(".skip-link").focus();
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    const openMenu = page.getByRole("button", { name: "Open menu" });
    await openMenu.click();
    await expect(page.locator("#mobile-navigation")).toHaveClass(/mobile-drawer--open/);
    await expect(page.getByRole("button", { name: "Close menu" })).toBeVisible();
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.locator("#mobile-navigation")).not.toHaveClass(/mobile-drawer--open/);
  });

  test("supports integrated search and useful empty-state recovery", async ({ page }) => {
    await page.goto("/search", { waitUntil: "networkidle" });
    await dismissCookie(page);
    const search = page.getByRole("textbox", { name: "Search products" });
    await search.fill("silk");
    await expect(page.getByRole("heading", { name: "No pieces found." })).not.toBeVisible();
    await search.fill("zzzz-no-such-piece");
    await expect(page.getByRole("heading", { name: "No pieces found." })).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.getByText("Browse all 8 pieces")).toBeVisible();
  });

  test("carries a product into the local checkout and exposes recovery messaging", async ({ page }) => {
    await page.goto("/products/meridian-frame-tote", { waitUntil: "networkidle" });
    await dismissCookie(page);
    await page.getByRole("button", { name: /Add to bag/ }).click();
    await expect(page.getByRole("button", { name: /Added to bag/ })).toBeVisible();
    await page.goto("/checkout", { waitUntil: "networkidle" });
    await dismissCookie(page);
    await page.getByLabel("Full name").fill("Amina Khan");
    await page.locator(".checkout-form").getByLabel("Email address").fill("amina@example.com");
    await page.locator(".checkout-form").getByRole("textbox", { name: "Address", exact: true }).fill("12 Studio Lane");
    await page.getByLabel("Demo outcome").selectOption("failure");
    await page.getByRole("button", { name: /Place demo order/ }).click();
    await expect(page.getByRole("alert")).toContainText("declined this demo attempt");
    await expect(page.getByText(/Try again|another method|payment/).last()).toBeVisible();
  });

  test("captures attribution and publishes route-aware trust metadata", async ({ page }) => {
    await page.goto("/faq?utm_source=journal&utm_medium=editorial&utm_campaign=summer", { waitUntil: "networkidle" });
    await dismissCookie(page);
    await expect(page).toHaveTitle(/FAQ/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Questions about/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index,follow");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/faq$/);
    await expect(page.locator('script#storefront-jsonld')).toBeAttached();
    expect(await page.evaluate(() => localStorage.getItem("usamabhanbhro-attribution"))).toContain("journal");
    for (const route of ["/privacy", "/terms", "/shipping-returns"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".last-updated")).toContainText("Last updated");
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("keeps images, reduced motion, and interaction feedback accessible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/shop", { waitUntil: "networkidle" });
    await dismissCookie(page);
    expect(await page.locator("img:not([alt])").count()).toBe(0);
    await expect(page.locator(".catalog-card").first()).toBeVisible();
    await page.locator(".catalog-card").first().getByRole("button", { name: /Save/ }).click();
    await expect(page.locator(".catalog-card").first().getByRole("button", { name: /Remove/ })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/products/meridian-frame-tote", { waitUntil: "networkidle" });
    await expect(page.locator(".mobile-buy-bar")).toBeVisible();
    await expect(page.locator(".mobile-buy-bar").getByRole("button", { name: /Add to bag|Added/ })).toBeVisible();
    const mobileCta = page.locator(".mobile-buy-bar").getByRole("button", { name: /Add to bag|Added/ });
    await mobileCta.focus();
    await expect(mobileCta).toBeFocused();
  });
});
