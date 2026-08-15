export type PromotionRecord = {
  id: string;
  name: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  targetType: "catalog" | "category" | "product";
  targetValue: string;
  status: "draft" | "scheduled" | "active" | "ended";
  startAt: string | null;
  endAt: string | null;
};

export type PromotionApplication = {
  id: string;
  name: string;
  discountPkr: number;
  pricePkr: number;
  compareAtPricePkr: number;
};

export function isPromotionLive(promotion: PromotionRecord, now = new Date()) {
  if (promotion.status !== "active") return false;
  const timestamp = now.getTime();
  if (promotion.startAt && new Date(promotion.startAt).getTime() > timestamp) return false;
  if (promotion.endAt && new Date(promotion.endAt).getTime() <= timestamp) return false;
  return true;
}

export function promotionTargetsProduct(promotion: PromotionRecord, product: { id: string; slug: string; category: string }) {
  if (promotion.targetType === "catalog") return true;
  if (promotion.targetType === "product") return promotion.targetValue === product.id || promotion.targetValue === product.slug;
  return promotion.targetValue.toLowerCase() === product.category.toLowerCase();
}

export function calculatePromotionPrice(pricePkr: number, promotion: PromotionRecord) {
  const discountPkr = promotion.discountType === "percentage"
    ? Math.round(pricePkr * (promotion.discountValue / 100))
    : promotion.discountValue;
  return Math.max(0, pricePkr - Math.min(pricePkr, discountPkr));
}

export function selectBestPromotion(
  pricePkr: number,
  product: { id: string; slug: string; category: string },
  promotions: PromotionRecord[],
  now = new Date(),
): PromotionApplication | null {
  const candidates = promotions
    .filter((promotion) => isPromotionLive(promotion, now) && promotionTargetsProduct(promotion, product))
    .map((promotion) => ({
      id: promotion.id,
      name: promotion.name,
      discountPkr: pricePkr - calculatePromotionPrice(pricePkr, promotion),
      pricePkr: calculatePromotionPrice(pricePkr, promotion),
      compareAtPricePkr: pricePkr,
    }))
    .filter((promotion) => promotion.discountPkr > 0)
    .sort((a, b) => b.discountPkr - a.discountPkr || a.id.localeCompare(b.id));
  return candidates[0] ?? null;
}

export function effectivePromotionStatus(
  promotion: Pick<PromotionRecord, "status" | "startAt" | "endAt">,
  now = new Date(),
): PromotionRecord["status"] {
  if (promotion.status === "draft") return "draft";
  if (promotion.status === "scheduled" && !promotion.startAt) return "scheduled";
  const timestamp = now.getTime();
  if (promotion.endAt && new Date(promotion.endAt).getTime() <= timestamp) return "ended";
  if (promotion.startAt && new Date(promotion.startAt).getTime() > timestamp) return "scheduled";
  return promotion.status === "ended" ? "ended" : "active";
}
