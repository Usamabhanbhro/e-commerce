import { expect, test } from "@playwright/test";

const surfaces = [
  ["home-desktop", "/", 1440, 1000],
  ["shop-desktop", "/shop", 1440, 1000],
  ["collection-desktop", "/collections/signature", 1440, 1000],
  ["product-desktop", "/products/meridian-frame-tote", 1440, 1000],
  ["journal-desktop", "/journal", 1440, 1000],
  ["article-desktop", "/journal/the-shape-of-a-day", 1440, 1000],
  ["contact-desktop", "/contact", 1440, 1000],
  ["home-mobile", "/", 390, 844],
  ["shop-mobile", "/shop", 390, 844],
  ["product-mobile", "/products/meridian-frame-tote", 390, 844],
  ["journal-mobile", "/journal", 390, 844],
  ["contact-mobile", "/contact", 390, 844],
] as const;

test.describe("reconstructed storefront visual baselines", () => {
  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({
      content: "*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; caret-color: transparent !important; }",
    });
  });

  for (const [name, route, width, height] of surfaces) {
    test(name, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(route, { waitUntil: "networkidle" });
      await expect(page.locator("body")).not.toBeEmpty();
      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        animations: "disabled",
        caret: "hide",
        maxDiffPixelRatio: 0.03,
      });
    });
  }
});
