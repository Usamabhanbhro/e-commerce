# Usamabhanbhro Route Smoke Evidence

## 2026-08-13 live preview

- `/` loaded with the Usamabhanbhro title, demo ribbon, sticky header, hero, product links, journal links, collections, newsletter, and footer navigation.
- `/shop` loaded with the eight-piece catalog, category filter buttons, sort selector, wishlist actions, product detail links, and local demo disclaimer.
- The browser-visible page content contains no source-brand copy in the live storefront surface.
- Desktop baseline at 1280px renders the editorial header, hero image, product grid, and page-intro hierarchy without a runtime error.
- `/products/meridian-frame-tote` loaded with gallery imagery, Cedar/Ink variants, quantity controls, add-to-bag, wishlist, related-product links, and the showcase disclaimer.
- Clicking `Add to bag` changed the control to `Added to bag ✓` and updated the header bag count from 0 to 1.
- `/cart` loaded the Meridian Frame Tote, local quantity controls, removal action, subtotal of Rs 48,500, delivery of Rs 1,200, total of Rs 49,700, and checkout CTA.
- `/checkout` loaded contact details, shipping, delivery method, promo field, demo outcome selector, and text-based provider options for JazzCash, Easypaisa, SadaPay, NayaPay, and Cash on Delivery.
- The checkout clearly states that connectors are simulated, no credentials are used, and no real card or financial information should be entered.
- Filling the checkout with synthetic contact values and submitting the default successful JazzCash demo redirected to `/order-confirmation`.
- Confirmation displayed a locally generated order number, JazzCash successful status, demo reference, subtotal, delivery, total, and the purchased Meridian Frame Tote summary; the bag count returned to 0.
- A second product journey on `/products/arc-mini-bag` also updated the bag count from 0 to 1 and switched the CTA to `Added to bag ✓`.
- The second `/checkout` journey preserved the Arc Mini Bag order summary and exposed the same five-provider selector; the demo outcome was switched to `Failed` for the recovery test.
- Submitting the failed JazzCash demo displayed `Payment needs attention`, a no-money-moved message, a demo reference code, `Retry`, and `Choose another method` actions without leaving checkout.
- Activating `Choose another method` kept the failed result, synthetic customer details, and Arc Mini Bag order summary in place while exposing the provider list for recovery.
- Selecting Easypaisa updated the primary checkout CTA to `Place demo order · Easypaisa`; switching the local demo outcome back to `Successful` prepared the alternate-provider recovery submission.
- The checkout still showed the prior JazzCash failure notice after changing provider and outcome; the explicit retry control is required to clear that transient result before a second submission.
- The live DOM exposed the title-case `Retry` control and accepted its click; the result panel was still visible immediately afterward, so the follow-up state needs a rendered-page check before calling the retry journey complete.
- After the React state settled, the failure panel disappeared and the checkout showed the active `Place demo order · Easypaisa` CTA with the synthetic details and Arc Mini Bag summary preserved.
- A first exact-DOM submit probe was rejected by the browser evaluator because it included TypeScript-only cast syntax; the app page itself remained intact and the probe is being retried with plain JavaScript.
- The plain-JavaScript submit succeeded after the retry reset and redirected to `/order-confirmation`; the page showed `Easypaisa · successful`, a demo reference, Rs 34,000 total, Arc Mini Bag × 1, and the bag count returned to 0.
