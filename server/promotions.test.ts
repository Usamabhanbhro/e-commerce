import { describe, expect, it } from "vitest";
import { calculatePromotionPrice, effectivePromotionStatus, isPromotionLive, selectBestPromotion } from "../shared/promotions";

const now = new Date("2026-08-15T12:00:00.000Z");
const base = { id: "promo-1", name: "Campaign", discountType: "percentage" as const, discountValue: 20, targetType: "catalog" as const, targetValue: "", status: "active" as const, startAt: null, endAt: null };

describe("promotion engine", () => {
  it("calculates bounded percentage and fixed discounts", () => {
    expect(calculatePromotionPrice(1000, base)).toBe(800);
    expect(calculatePromotionPrice(1000, { ...base, discountType: "fixed", discountValue: 1400 })).toBe(0);
  });
  it("honours scheduled, active, and ended boundaries", () => {
    expect(effectivePromotionStatus({ status: "scheduled", startAt: "2026-08-16T00:00:00.000Z", endAt: null }, now)).toBe("scheduled");
    expect(effectivePromotionStatus({ status: "active", startAt: null, endAt: "2026-08-15T12:00:00.000Z" }, now)).toBe("ended");
    expect(isPromotionLive({ ...base, startAt: "2026-08-15T12:00:00.000Z" }, now)).toBe(true);
  });
  it("targets category and product scopes", () => {
    expect(selectBestPromotion(1000, { id: "p1", slug: "bag", category: "Bags" }, [{ ...base, targetType: "category", targetValue: "bags" }], now)?.discountPkr).toBe(200);
    expect(selectBestPromotion(1000, { id: "p1", slug: "bag", category: "Bags" }, [{ ...base, targetType: "product", targetValue: "other" }], now)).toBeNull();
  });
  it("resolves overlap deterministically", () => {
    const selected = selectBestPromotion(1000, { id: "p1", slug: "bag", category: "Bags" }, [{ ...base, id: "promo-b" }, { ...base, id: "promo-a" }, { ...base, id: "promo-c", discountValue: 10 }], now);
    expect(selected?.id).toBe("promo-a");
  });
});
