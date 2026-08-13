// Usamabhanbhro payment boundary: UI talks to this interface, while every provider below remains a local demo connector.
export type PaymentStatus = "pending" | "initiated" | "successful" | "failed" | "cancelled";
export type PaymentMethod = "jazzcash" | "easypaisa" | "sadapay" | "nayapay" | "cod";
export type PaymentRequest = { amount: number; orderId: string; demoOutcome?: "success" | "failure" | "pending" | "cancelled" };
export type PaymentResult = { status: PaymentStatus; referenceId: string; message: string; providerMetadata: Record<string, string> };

export interface PaymentProvider {
  id: PaymentMethod;
  name: string;
  description: string;
  initialize(request: PaymentRequest): Promise<PaymentResult>;
  verify(referenceId: string): Promise<PaymentResult>;
  cancel(referenceId: string): Promise<PaymentResult>;
  refund(referenceId: string): Promise<PaymentResult>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const reference = (id: string) => `DEMO-${id.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

abstract class DemoProvider implements PaymentProvider {
  abstract id: PaymentMethod;
  abstract name: string;
  abstract description: string;

  async initialize(request: PaymentRequest): Promise<PaymentResult> {
    await sleep(320);
    const referenceId = reference(this.id);
    const outcome = request.demoOutcome ?? "success";
    if (outcome === "failure") return { status: "failed", referenceId, message: "The simulated provider declined this demo attempt. No money was moved.", providerMetadata: { mode: "showcase", amount: String(request.amount) } };
    if (outcome === "pending") return { status: "pending", referenceId, message: "Demo payment is pending provider confirmation. No money was moved.", providerMetadata: { mode: "showcase", amount: String(request.amount) } };
    if (outcome === "cancelled") return { status: "cancelled", referenceId, message: "The simulated payment was cancelled. No money was moved.", providerMetadata: { mode: "showcase" } };
    return { status: "successful", referenceId, message: "Demo payment approved for showcase purposes only.", providerMetadata: { mode: "showcase", amount: String(request.amount) } };
  }

  async verify(referenceId: string) { await sleep(120); return { status: "successful" as const, referenceId, message: "Demo reference verified locally.", providerMetadata: { mode: "showcase" } }; }
  async cancel(referenceId: string) { return { status: "cancelled" as const, referenceId, message: "Demo payment cancelled locally.", providerMetadata: { mode: "showcase" } }; }
  async refund(referenceId: string) { return { status: "pending" as const, referenceId, message: "Refund capability is reserved for a future secure backend.", providerMetadata: { mode: "showcase" } }; }
}

export class JazzCashPaymentConnector extends DemoProvider { id = "jazzcash" as const; name = "JazzCash"; description = "Mobile wallet demo connector"; }
export class EasypaisaPaymentConnector extends DemoProvider { id = "easypaisa" as const; name = "Easypaisa"; description = "Mobile wallet demo connector"; }
export class SadaPayPaymentConnector extends DemoProvider { id = "sadapay" as const; name = "SadaPay"; description = "Digital account demo connector"; }
export class NayaPayPaymentConnector extends DemoProvider { id = "nayapay" as const; name = "NayaPay"; description = "Digital wallet demo connector"; }

export class CashOnDeliveryPaymentConnector extends DemoProvider {
  id = "cod" as const; name = "Cash on Delivery"; description = "Pay when your demo order arrives";
  async initialize(request: PaymentRequest) { await sleep(180); return { status: request.demoOutcome === "cancelled" ? "cancelled" as const : "pending" as const, referenceId: reference("cod"), message: request.demoOutcome === "cancelled" ? "Demo COD order cancelled." : "Demo COD order created; collection is pending.", providerMetadata: { mode: "showcase", collectionStatus: "pending" } }; }
}

export const paymentProviders: PaymentProvider[] = [new JazzCashPaymentConnector(), new EasypaisaPaymentConnector(), new SadaPayPaymentConnector(), new NayaPayPaymentConnector(), new CashOnDeliveryPaymentConnector()];
export const paymentRegistry = Object.fromEntries(paymentProviders.map((provider) => [provider.id, provider])) as Record<PaymentMethod, PaymentProvider>;
