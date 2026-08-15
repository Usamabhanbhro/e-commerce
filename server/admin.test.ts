import { describe, expect, it } from "vitest";
import { hasAdminPermission } from "./admin";
import { validateMediaInput } from "./storage";

describe("merchant admin RBAC", () => {
  it("gives owners the complete workspace surface", () => {
    expect(hasAdminPermission("owner", "staff")).toBe(true);
    expect(hasAdminPermission("owner", "settings")).toBe(true);
    expect(hasAdminPermission("owner", "banners")).toBe(true);
  });

  it("keeps staff operational but not structural", () => {
    expect(hasAdminPermission("staff", "orders")).toBe(true);
    expect(hasAdminPermission("staff", "inventory")).toBe(true);
    expect(hasAdminPermission("staff", "categories")).toBe(false);
    expect(hasAdminPermission("staff", "promotions")).toBe(false);
    expect(hasAdminPermission("staff", "settings")).toBe(false);
  });

  it("does not grant unknown permissions", () => {
    expect(hasAdminPermission("admin", "delete_database")).toBe(false);
    expect(hasAdminPermission("staff", "staff")).toBe(false);
  });

  it("accepts bounded image uploads under the merchant namespace", () => {
    expect(() => validateMediaInput("merchant/home/hero.webp", "image/webp", 1024)).not.toThrow();
  });

  it("rejects unsafe, non-image, and oversized uploads", () => {
    expect(() => validateMediaInput("../secrets.txt", "text/plain", 100)).toThrow("Invalid storage key");
    expect(() => validateMediaInput("merchant/home/hero.svg", "image/svg+xml", 100)).toThrow("Only image uploads");
    expect(() => validateMediaInput("merchant/home/hero.png", "image/png", 11 * 1024 * 1024)).toThrow("between 1 byte and 10 MB");
  });
});
