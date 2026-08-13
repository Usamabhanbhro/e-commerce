# Usamabhanbhro E-commerce Showcase

Usamabhanbhro is an original, client-presentable premium fashion and objects storefront demonstration. It preserves an editorial luxury direction while adding a complete local commerce journey: catalog discovery, collection browsing, product detail, search, wishlist, cart, checkout, order confirmation, account dashboard, journal, about, and contact.

This is intentionally a **frontend showcase**, not a production store. Product data, cart state, wishlist state, newsletter signup, contact form, and orders are local mock behavior. The checkout never asks for card numbers, never calls a payment API, never sends personal information to an external service, and never represents a simulated result as a real transaction.

## Technology stack

- React 19 with TypeScript
- Vite 7 and Wouter client-side routing
- CSS-first responsive editorial system
- LocalStorage-backed mock commerce state
- Vitest for payment connector tests
- Pexels-hosted presentation imagery used as temporary visual assets

## Features

- Sticky responsive header with desktop navigation, mobile drawer, bag count, and wishlist count.
- Original product catalog with category filters, sorting, hover imagery, variants, availability, related products, and accessible alt text.
- Local cart and wishlist persistence with quantity controls, removal, subtotal, delivery estimate, empty states, and suggested pieces.
- Demo checkout with contact details, shipping, delivery method, promo placeholder, order summary, validation, processing, success, pending, failed, and cancelled states.
- Provider-agnostic Pakistani payment architecture with text-based demo selectors for JazzCash, Easypaisa, SadaPay, NayaPay, and Cash on Delivery.
- Editorial journal, article pages, collection index/detail pages, account dashboard, about page, contact success state, and custom 404.
- Reduced-motion support, keyboard-safe controls, responsive layouts for desktop, tablet, and mobile, and no dead-end public links.

## Route map

| Route | Purpose |
|---|---|
| `/` | Premium homepage and showcase entry |
| `/shop` | Filterable and sortable all-products grid |
| `/collections` | Collection overview |
| `/collections/:slug` | Editorial collection detail and products |
| `/products/:slug` | Gallery, variants, quantity, bag, wishlist, and related products |
| `/search` | Local search with matching and empty states |
| `/cart` | Interactive local shopping bag |
| `/checkout` | Demo-only checkout and payment selection |
| `/order-confirmation` | Local mock order confirmation |
| `/account` | Mock customer dashboard |
| `/wishlist` | Local saved-products view |
| `/journal` | Editorial index |
| `/journal/:slug` | Reusable article page |
| `/about` | Brand and project concept |
| `/contact` | Demo contact form |
| any invalid route | Styled 404 page |

## Architecture

The UI is separated from commerce contracts in `client/src/lib`. `catalog.ts` owns the product and editorial domain model. `commerce.tsx` owns local cart, wishlist, and order state. `payment.ts` defines the `PaymentProvider` interface and registry, so a future secure server-side connector can replace any demo adapter without rewriting checkout components.

The intended production boundary is:

```text
Checkout UI → Order Service → Payment Service → PaymentProvider → Provider adapter
```

The current implementation stops at local simulation. It contains no credentials, merchant IDs, API keys, undocumented endpoints, or provider-specific secrets.

## Supported payment connector architecture

| Connector | Current behavior | Production note |
|---|---|---|
| JazzCash | Local success, pending, failure, and cancellation simulation | Requires a secure backend adapter and merchant configuration |
| Easypaisa | Local success, pending, failure, and cancellation simulation | Requires a secure backend adapter and merchant configuration |
| SadaPay | Local success, pending, failure, and cancellation simulation | Requires a secure backend adapter and merchant configuration |
| NayaPay | Local success, pending, failure, and cancellation simulation | Requires a secure backend adapter and merchant configuration |
| Cash on Delivery | Local order creation and pending collection simulation | Future order service should record collection and cancellation events |

## Local development

```bash
pnpm install
pnpm dev
```

Useful verification commands:

```bash
pnpm check
pnpm lint
pnpm test
pnpm build
```

## Demo-mode disclaimer

All payment outcomes, order references, customer details, newsletter submissions, and contact submissions are showcase-only. Do not enter real financial credentials or sensitive personal information. Before production, add a secure backend, real provider contracts, server-side validation, authenticated customer storage, an order service, a webhook handler, fraud controls, and environment-managed secrets.

## Verification status

The final project is intended to be verified through the commands above plus route smoke testing and the journey `Home → Collection → Product → Bag → Checkout → Demo Confirmation`. The repository-wide source search must return no intentional references to the replaced source brand or its campaign language.
