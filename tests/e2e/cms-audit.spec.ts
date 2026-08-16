import { expect, test, type Page } from "@playwright/test";

const token = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function loginAsDemoOwner(page: Page) {
  const response = await page.request.post("/api/admin/demo-login", { data: {} });
  expect(response.status()).toBe(200);
}

async function openAdmin(page: Page, section = "") {
  await page.goto(`/admin${section ? `/${section}` : ""}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".admin-app")).toBeVisible();
}

async function saveForm(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

function productByName(page: Page, name: string) {
  return page.getByRole("row", { name: new RegExp(name, "i") });
}

test.describe("merchant CMS browser audit", () => {
  test("rejects unauthenticated admin and commerce account access", async ({ page }) => {
    const admin = await page.request.get("/api/admin/bootstrap");
    expect(admin.status()).toBe(401);
    const account = await page.request.get("/api/account");
    expect(account.status()).toBe(401);
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /A quieter way to run the store/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Open local demo owner workspace/i })).toBeVisible();
  });

  test("owner can navigate every documented merchant section and mobile navigation remains usable", async ({ page }) => {
    await loginAsDemoOwner(page);
    for (const [path, heading] of [["", "Good morning"], ["products", "Products"], ["categories", "Categories"], ["inventory", "Inventory"], ["promotions", "Promotions"], ["banners", "Banners"], ["orders", "Orders"], ["customers", "Customers"], ["staff", "Staff"], ["audit", "Audit log"], ["settings", "Settings"]] as const) {
      await openAdmin(page, path);
      await expect(page.getByRole("heading", { name: new RegExp(heading, "i") })).toBeVisible();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await openAdmin(page);
    const menu = page.getByRole("button", { name: /open merchant navigation/i });
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole("button", { name: /close merchant navigation/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Products", exact: true }).first()).toBeVisible();
  });

  test("creates, edits, filters, and archives a product through the merchant UI", async ({ page }) => {
    await loginAsDemoOwner(page);
    await openAdmin(page, "products");
    const id = token();
    await page.getByRole("button", { name: /New product/i }).click();
    await page.getByLabel("Product name").fill(`Browser Audit Product ${id}`);
    await page.getByLabel("Slug").fill(`browser-audit-product-${id}`);
    await page.getByLabel("Price (PKR)").fill("3450");
    await page.getByLabel("Stock").fill("7");
    await page.getByLabel("Category").fill("Bags");
    await page.getByLabel("Collection").fill("Essentials");
    await page.getByLabel("Description").fill("A browser audit product with enough detail for the catalog workflow.");
    await page.getByLabel("Tags").fill("audit, browser");
    await page.getByLabel("Featured").check();
    await saveForm(page, "Save product");
    await expect(page.getByText("Product created.")).toBeVisible();
    await expect(productByName(page, `Browser Audit Product ${id}`)).toBeVisible();

    const createdProductRow = productByName(page, `Browser Audit Product ${id}`);
    await createdProductRow.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Price (PKR)").fill("3650");
    await saveForm(page, "Save product");
    await expect(page.getByText("Product updated.")).toBeVisible();

    await page.locator(".admin-search input").fill(`Browser Audit Product ${id}`);
    await expect(productByName(page, `Browser Audit Product ${id}`)).toBeVisible();
    await page.on("dialog", (dialog) => dialog.accept());
    await productByName(page, `Browser Audit Product ${id}`).getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.getByText("Product archived.")).toBeVisible();
    await expect(productByName(page, `Browser Audit Product ${id}`)).toContainText(/archived/i);
  });

  test("validates product and category payloads before mutation", async ({ page }) => {
    await loginAsDemoOwner(page);
    const invalidProduct = await page.request.post("/api/admin/products", { data: { name: "x", slug: "Bad Slug", pricePkr: -1, stock: -1, category: "Missing", collection: "", description: "short" } });
    expect(invalidProduct.status()).toBe(400);
    const invalidCategory = await page.request.post("/api/admin/categories", { data: { slug: "bad slug", name: "x", description: "", imageUrl: "not-a-url", status: "active", sortOrder: -1 } });
    expect(invalidCategory.status()).toBe(400);
  });

  test("creates, edits, and archives a category while preserving persistence after reload", async ({ page }) => {
    await loginAsDemoOwner(page);
    await openAdmin(page, "categories");
    const id = token();
    await page.getByRole("button", { name: /New category/i }).click();
    await page.getByLabel("Name").fill(`Browser Category ${id}`);
    await page.getByLabel("Slug").fill(`browser-category-${id}`);
    await page.getByLabel("Description").fill("Category created by the browser audit suite.");
    await page.locator('input[name="imageUrl"]').fill("https://example.com/browser-category.webp");
    await saveForm(page, "Save category");
    await expect(page.getByText("Category created.")).toBeVisible();
    const categoryCard = page.getByRole("article").filter({ hasText: `Browser Category ${id}` });
    await expect(categoryCard).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("article").filter({ hasText: `Browser Category ${id}` })).toBeVisible();
    const createdCategoryCard = page.getByRole("article").filter({ hasText: `Browser Category ${id}` });
    await createdCategoryCard.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Description").fill("Category edited and persisted by the browser audit suite.");
    await saveForm(page, "Save category");
    await expect(page.getByText("Category updated.")).toBeVisible();
    await page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("article").filter({ hasText: `Browser Category ${id}` }).getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.getByText("Category archived.")).toBeVisible();
  });

  test("adjusts inventory, records history, and blocks a negative result", async ({ page }) => {
    await loginAsDemoOwner(page);
    await openAdmin(page, "inventory");
    const row = page.locator(".admin-table").first().locator("tbody tr").filter({ hasText: "Meridian Frame Tote" }).first();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Adjust stock", exact: true }).click();
    await page.getByLabel("Adjustment").fill("2");
    const receivingReason = `Browser receiving ${token()}`;
    await page.getByLabel("Reason").fill(receivingReason);
    await saveForm(page, "Record adjustment");
    await expect(page.getByText("Inventory adjustment recorded.")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Recent adjustments/i })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(receivingReason, { exact: true })).toBeVisible();

    await page.locator(".admin-table").first().locator("tbody tr").filter({ hasText: "Meridian Frame Tote" }).first().getByRole("button", { name: "Adjust stock", exact: true }).click();
    await page.getByLabel("Adjustment").fill("-999999");
    await page.getByLabel("Reason").fill("Browser negative stock guard");
    await saveForm(page, "Record adjustment");
    await expect(page.getByText("Inventory cannot become negative.")).toBeVisible();
  });

  test("creates a promotion, validates its target, and exposes the active result to storefront consumers", async ({ page }) => {
    await loginAsDemoOwner(page);
    const invalid = await page.request.post("/api/admin/promotions", { data: { name: "Invalid browser target", discountType: "percentage", discountValue: 15, targetType: "category", targetValue: "missing-browser-category", status: "active" } });
    expect(invalid.status()).toBe(400);
    await openAdmin(page, "promotions");
    const id = token();
    await page.getByRole("button", { name: /New promotion/i }).click();
    await page.getByLabel("Name").fill(`Browser Promotion ${id}`);
    await page.getByLabel("Description").fill("A browser audit campaign.");
    await page.locator('input[name="discountValue"]').fill("15");
    await page.getByLabel("Lifecycle").selectOption("active");
    await saveForm(page, "Save promotion");
    await expect(page.getByText("Promotion created.")).toBeVisible();
    const catalog = await page.request.get("/api/catalog");
    expect(catalog.status()).toBe(200);
    const payload = await catalog.json();
    const promoted = payload.products.find((product: { promotion?: { name: string } | null }) => product.promotion?.name === `Browser Promotion ${id}`);
    expect(promoted).toBeTruthy();
    expect(promoted.pricePkr).toBeLessThan(promoted.compareAtPricePkr);
    await page.goto(`/products/${promoted.slug}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: promoted.name })).toBeVisible();
    const formattedPrice = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(promoted.pricePkr);
    await expect(page.getByText(formattedPrice)).toBeVisible();
    await openAdmin(page, "promotions");
    const promotionRow = page.getByRole("row").filter({ hasText: `Browser Promotion ${id}` });
    await promotionRow.getByRole("button", { name: "Deactivate", exact: true }).click();
    await expect(promotionRow).toContainText(/draft/i);
  });

  test("creates a banner and verifies active content reaches the homepage", async ({ page }) => {
    await loginAsDemoOwner(page);
    await openAdmin(page, "banners");
    const id = token();
    await page.getByRole("button", { name: /New banner/i }).click();
    await page.locator('input[name="imageUrl"]').fill("https://example.com/browser-banner.webp");
    await page.locator('input[name="title"]').fill(`Browser Banner ${id}`);
    await page.getByLabel("Subtitle").fill("Browser audit banner");
    await page.getByLabel("CTA text").fill("Shop audit");
    await page.getByLabel("Destination").fill("/shop");
    await page.getByLabel("Lifecycle").selectOption("active");
    await saveForm(page, "Save banner");
    await expect(page.getByText("Banner created.")).toBeVisible();
    const catalog = await page.request.get("/api/catalog");
    const payload = await catalog.json();
    expect(payload.banners.some((banner: { title: string }) => banner.title === `Browser Banner ${id}`)).toBe(true);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".hero__image")).toHaveAttribute("src", /browser-banner/);
    await openAdmin(page, "banners");
    const bannerCard = page.getByRole("article").filter({ hasText: `Browser Banner ${id}` });
    await bannerCard.getByRole("button", { name: "Unpublish", exact: true }).click();
    await expect(bannerCard).toContainText(/draft/i);
  });

  test("orders, customers, audit, staff protection, and settings remain operational", async ({ page }) => {
    await loginAsDemoOwner(page);
    await openAdmin(page, "orders");
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
    await expect(page.getByText(/No orders yet|Order/).first()).toBeVisible();
    await openAdmin(page, "customers");
    await page.getByPlaceholder("Search customers").fill("demo");
    await expect(page.getByText(/No customers found|customer/i).first()).toBeVisible();
    await openAdmin(page, "audit");
    await page.getByPlaceholder("Resource filter").fill("category");
    await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
    await openAdmin(page, "staff");
    const staffPayload = await (await page.request.get("/api/admin/staff")).json();
    const owner = staffPayload.items.find((item: { role: string }) => item.role === "owner");
    expect(owner).toBeTruthy();
    if (owner?.id) {
      const protectedRoleChange = await page.request.patch(`/api/admin/staff/${owner.id}`, { data: { role: "staff" } });
      expect(protectedRoleChange.status()).toBe(404);
    }
    await openAdmin(page, "settings");
    await expect(page.getByText(/PostgreSQL|R2|OAuth|Demo/).first()).toBeVisible();
  });

  test("public storefront supports search, filters, wishlist, cart, checkout outcome, confirmation, and contact form", async ({ page }) => {
    await page.goto("/shop", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Shop all" })).toBeVisible();
    await page.getByRole("button", { name: "Bags", exact: true }).click();
    await expect(page.getByText(/pieces · demo catalog/)).toBeVisible();
    await page.goto("/search", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Search products").fill("bag");
    await expect(page.getByText(/results for/i)).toBeVisible();
    const card = page.locator(".catalog-card").first();
    const productName = await card.locator("h3").innerText();
    await card.getByRole("button", { name: new RegExp(`Save ${productName}`, "i") }).click();
    await expect(card.getByRole("button", { name: new RegExp(`Remove ${productName}`, "i") })).toHaveAttribute("aria-pressed", "true");
    await card.getByRole("link", { name: /View piece/i }).click();
    await expect(page.getByRole("button", { name: /Add to bag/i })).toBeVisible();
    await page.getByRole("button", { name: /Add to bag/i }).click();
    await page.goto("/cart", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Shopping bag" })).toBeVisible();
    await page.getByRole("link", { name: /Continue to checkout/i }).click();
    await page.getByLabel("Full name").fill("Browser Audit Shopper");
    await page.locator(".checkout-form").getByLabel("Email address").fill("browser-audit@example.test");
    await page.locator(".checkout-form").getByRole("textbox", { name: "Address", exact: true }).fill("12 Browser Lane");
    await page.getByLabel("Demo outcome").selectOption("failure");
    await page.getByRole("button", { name: /Place demo order/i }).click();
    await expect(page.getByRole("alert")).toContainText(/Payment needs attention/i);
    await page.getByLabel("Demo outcome").selectOption("success");
    await page.getByRole("button", { name: /Place demo order/i }).click();
    await expect(page).toHaveURL(/order-confirmation/);
    await expect(page.getByText(/demo order has been created locally/i)).toBeVisible();
    await page.goto("/contact", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Name").fill("Browser Audit Shopper");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("browser-audit@example.test");
    await page.getByLabel("How can we help?").fill("Testing the customer-facing demo journey.");
    await page.getByRole("button", { name: /Send demo message/i }).click();
    await expect(page.locator(".contact-form").getByRole("status")).toContainText(/recorded your message locally/i);
  });

  test("public error states, reduced motion, and layout overflow remain controlled", async ({ page }) => {
    await page.goto("/products/does-not-exist", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /This page has.*not been made yet/i })).toBeVisible();
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await loginAsDemoOwner(page);
    await openAdmin(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page).toHaveScreenshot(`cms-dashboard-${test.info().project.name}.png`, { fullPage: false, animations: "disabled", maxDiffPixelRatio: 0.03 });
    for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }]) {
      await page.setViewportSize(viewport);
      await openAdmin(page);
      const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      expect(overflow.width).toBeLessThanOrEqual(overflow.viewport + 1);
    }
  });
});
