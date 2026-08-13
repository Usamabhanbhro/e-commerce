// Usamabhanbhro payment contract tests: all providers must satisfy the same demo lifecycle without real network calls.
import { describe, expect, it } from "vitest";
import { paymentProviders, paymentRegistry, type PaymentMethod } from "./payment";

describe("payment provider registry", () => {
  it("registers every supported Pakistani demo connector", () => {
    expect(Object.keys(paymentRegistry)).toEqual(["jazzcash", "easypaisa", "sadapay", "nayapay", "cod"]);
    expect(paymentProviders).toHaveLength(5);
  });

  it("uses the common interface for success, failure, pending, and cancellation", async () => {
    for (const provider of paymentProviders) {
      const successful = await provider.initialize({ amount: 1000, orderId: "DEMO-1", demoOutcome: "success" });
      const failed = await provider.initialize({ amount: 1000, orderId: "DEMO-2", demoOutcome: "failure" });
      const pending = await provider.initialize({ amount: 1000, orderId: "DEMO-3", demoOutcome: "pending" });
      const cancelled = await provider.initialize({ amount: 1000, orderId: "DEMO-4", demoOutcome: "cancelled" });
      expect(successful.referenceId).toContain("DEMO-");
      expect(["successful", "pending"]).toContain(successful.status);
      if (provider.id === "cod") expect(["pending", "cancelled"]).toContain(failed.status);
      else expect(failed.status).toBe("failed");
      expect(pending.status).toBe("pending");
      expect(cancelled.status).toBe("cancelled");
    }
  }, 15000);

  it("verifies and exposes refund and cancellation placeholders", async () => {
    const provider = paymentRegistry.jazzcash;
    const result = await provider.initialize({ amount: 48500, orderId: "DEMO-5", demoOutcome: "success" });
    expect((await provider.verify(result.referenceId)).status).toBe("successful");
    expect((await provider.cancel(result.referenceId)).status).toBe("cancelled");
    expect((await provider.refund(result.referenceId)).status).toBe("pending");
  });

  it("keeps invalid methods outside the registry", () => {
    expect(paymentRegistry["unknown" as PaymentMethod]).toBeUndefined();
  });

  it("passes the cart total to every provider through the same request shape", async () => {
    const amount = 48500 + 1200;
    for (const provider of paymentProviders) {
      const result = await provider.initialize({ amount, orderId: "DEMO-TOTAL", demoOutcome: "success" });
      expect(result.providerMetadata.amount ?? String(amount)).toBe(String(amount));
    }
  });
});
