import type { PaymentStatus } from "./paymentProviders";

const paymentTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["pending", "initiated", "successful", "failed", "cancelled"],
  initiated: ["initiated", "successful", "failed", "cancelled"],
  successful: ["successful"],
  failed: ["failed"],
  cancelled: ["cancelled"],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus) { return paymentTransitions[from]?.includes(to) ?? false; }
export function canTransitionInventory(from: string, to: string) {
  const transitions: Record<string, string[]> = { reserved: ["reserved", "released", "committed"], released: ["released"], committed: ["committed"] };
  return transitions[from]?.includes(to) ?? false;
}
