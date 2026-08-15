import type { PaymentMethod, PaymentStatus } from "../server/paymentProviders";

export type OrderLineInput = { productId: string; variantId?: string; quantity: number };
export type AddressInput = { label: string; recipient: string; phone: string; line1: string; line2?: string; city: string; postalCode?: string; country: string };
export type DemoOrder = { id: string; orderNumber: string; userId: string; email: string; lines: Array<{ productId: string; productName: string; variant?: string; quantity: number; unitPricePkr: number; imageUrl: string }>; address: AddressInput; subtotalPkr: number; shippingPkr: number; discountPkr: number; totalPkr: number; paymentStatus: PaymentStatus; fulfillmentStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled"; inventoryStatus: "reserved" | "released" | "committed"; demoMode: true; createdAt: number };
export type DemoPayment = { id: string; orderId: string; provider: PaymentMethod; amountPkr: number; status: PaymentStatus; referenceId: string; idempotencyKey: string; message: string; providerMetadata: Record<string, string>; createdAt: number };
