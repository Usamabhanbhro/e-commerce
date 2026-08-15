import crypto from "node:crypto";
import { paymentMode } from "./env";

export type PaymentMethod = "jazzcash" | "easypaisa" | "sadapay" | "nayapay" | "cod";
export type PaymentStatus = "pending" | "initiated" | "successful" | "failed" | "cancelled";
export type DemoOutcome = "success" | "failure" | "pending" | "cancelled";
export type PaymentRequest = { orderId: string; amountPkr: number; idempotencyKey: string; outcome?: DemoOutcome };
export type ProviderResult = { status: PaymentStatus; referenceId: string; message: string; providerMetadata: Record<string, string> };

export interface PaymentProvider { initializePayment(request: PaymentRequest): Promise<ProviderResult>; verifyPayment(referenceId: string): Promise<ProviderResult>; cancelPayment(referenceId: string): Promise<ProviderResult>; refundPayment(referenceId: string): Promise<ProviderResult>; }

class DeterministicMockProvider implements PaymentProvider {
  constructor(private readonly method: PaymentMethod) {}
  async initializePayment(request: PaymentRequest): Promise<ProviderResult> {
    const referenceId = `DEMO-${this.method.toUpperCase()}-${crypto.createHash("sha256").update(request.idempotencyKey).digest("hex").slice(0, 12).toUpperCase()}`;
    if (this.method === "cod") return { status: request.outcome === "cancelled" ? "cancelled" : "pending", referenceId, message: request.outcome === "cancelled" ? "Demo COD order cancelled." : "Demo COD order created; collection is pending.", providerMetadata: { mode: paymentMode, collectionStatus: "pending" } };
    const status = request.outcome === "failure" ? "failed" : request.outcome === "pending" ? "pending" : request.outcome === "cancelled" ? "cancelled" : "successful";
    const message = status === "successful" ? "Demo payment authorised. No real payment information was collected or transmitted." : status === "failed" ? "Demo payment was declined. No money moved." : status === "cancelled" ? "Demo payment was cancelled. No money moved." : "Demo payment remains pending provider confirmation.";
    return { status, referenceId, message, providerMetadata: { mode: paymentMode, amount: String(request.amountPkr) } };
  }
  async verifyPayment(referenceId: string) { return { status: "successful" as const, referenceId, message: "Demo reference verified locally.", providerMetadata: { mode: paymentMode } }; }
  async cancelPayment(referenceId: string) { return { status: "cancelled" as const, referenceId, message: "Demo payment cancelled locally.", providerMetadata: { mode: paymentMode } }; }
  async refundPayment(referenceId: string) { return { status: "pending" as const, referenceId, message: "Refund capability is reserved for the official provider adapter.", providerMetadata: { mode: paymentMode } }; }
}

class ProductionProvider implements PaymentProvider {
  private unavailable(): never { throw new Error("Production payments are unavailable until the official provider adapter is configured."); }
  initializePayment(_request: PaymentRequest): Promise<ProviderResult> { return Promise.reject(this.unavailable()); }
  verifyPayment(_referenceId: string): Promise<ProviderResult> { return Promise.reject(this.unavailable()); }
  cancelPayment(_referenceId: string): Promise<ProviderResult> { return Promise.reject(this.unavailable()); }
  refundPayment(_referenceId: string): Promise<ProviderResult> { return Promise.reject(this.unavailable()); }
}

export function createPaymentProvider(method: PaymentMethod): PaymentProvider {
  if (paymentMode === "production") return new ProductionProvider();
  return new DeterministicMockProvider(method);
}
