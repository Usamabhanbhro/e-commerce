import { describe, expect, it } from "vitest";
import { hasAdminPermission } from "./admin";

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
});
