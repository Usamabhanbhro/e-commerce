# Usamabhanbhro Payment Connector Architecture

The payment layer is deliberately provider-agnostic and demo-only. `PaymentProvider` in `client/src/lib/payment.ts` defines initialization, verification, cancellation, refund placeholder behavior, transaction references, provider metadata, and status transitions. Checkout uses the registry rather than importing an individual adapter.

The current registry contains `JazzCashPaymentConnector`, `EasypaisaPaymentConnector`, `SadaPayPaymentConnector`, `NayaPayPaymentConnector`, and `CashOnDeliveryPaymentConnector`. Each connector returns local results and includes `mode: showcase` metadata. No adapter calls a live endpoint or stores a credential.

Future production work should place provider calls behind a secure server-side payment service. The frontend should receive an order session and status from that service, while webhooks update the order state asynchronously. Provider credentials, merchant identifiers, signatures, and webhook verification must never be shipped to the browser.

The demo flow supports a client presentation of successful, initiated, pending, failed, cancelled, and COD collection states. A result is never described as a real financial transaction.
