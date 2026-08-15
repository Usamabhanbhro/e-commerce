import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { canTransitionInventory, canTransitionPayment } from "./orderState";
import { verifyHmac } from "./security";

describe("durable commerce invariants", () => {
  it("allows forward payment transitions but rejects regression", () => {
    expect(canTransitionPayment("pending", "successful")).toBe(true);
    expect(canTransitionPayment("successful", "failed")).toBe(false);
    expect(canTransitionPayment("cancelled", "successful")).toBe(false);
  });

  it("allows inventory reservation to release or commit exactly once", () => {
    expect(canTransitionInventory("reserved", "released")).toBe(true);
    expect(canTransitionInventory("reserved", "committed")).toBe(true);
    expect(canTransitionInventory("released", "committed")).toBe(false);
    expect(canTransitionInventory("committed", "released")).toBe(false);
  });

  it("verifies webhook HMAC signatures with timing-safe comparison", () => {
    const payload = JSON.stringify({ eventId: "evt-1", status: "successful" });
    const secret = "a".repeat(32);
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    expect(verifyHmac(payload, signature, secret)).toBe(true);
    expect(verifyHmac(payload, `${signature.slice(0, -1)}0`, secret)).toBe(false);
    expect(verifyHmac(payload, undefined, secret)).toBe(false);
  });

  it("allows pending payment initialization", () => expect(canTransitionPayment("pending", "initiated")).toBe(true));
  it("allows an idempotent pending payment callback", () => expect(canTransitionPayment("pending", "pending")).toBe(true));
  it("allows an idempotent initiated payment callback", () => expect(canTransitionPayment("initiated", "initiated")).toBe(true));
  it("allows initiated payment failure", () => expect(canTransitionPayment("initiated", "failed")).toBe(true));
  it("allows initiated payment cancellation", () => expect(canTransitionPayment("initiated", "cancelled")).toBe(true));
  it("preserves a successful terminal payment", () => expect(canTransitionPayment("successful", "successful")).toBe(true));
  it("preserves a failed terminal payment", () => expect(canTransitionPayment("failed", "failed")).toBe(true));
  it("preserves a cancelled terminal payment", () => expect(canTransitionPayment("cancelled", "cancelled")).toBe(true));
  it("rejects unknown payment states", () => expect(canTransitionPayment("unknown" as never, "successful")).toBe(false));
  it("allows an idempotent inventory reservation", () => expect(canTransitionInventory("reserved", "reserved")).toBe(true));
  it("preserves released inventory", () => expect(canTransitionInventory("released", "released")).toBe(true));
  it("preserves committed inventory", () => expect(canTransitionInventory("committed", "committed")).toBe(true));
  it("rejects unknown inventory states", () => expect(canTransitionInventory("unknown", "reserved")).toBe(false));
  it("rejects a signature computed with another secret", () => {
    const payload = "webhook-payload";
    const signature = crypto.createHmac("sha256", "correct-secret").update(payload).digest("hex");
    expect(verifyHmac(payload, signature, "wrong-secret")).toBe(false);
  });
  it("rejects an empty signature", () => expect(verifyHmac("payload", "", "secret")).toBe(false));
});
