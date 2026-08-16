# Storefront audit findings

## Existing architecture

The public storefront is a React 19 + TypeScript + Vite application using Wouter routes, a shared `StorefrontLayout`, and `CommerceProvider`. Public routes include home, shop, collections, product detail, search, cart, checkout, confirmation, account, wishlist, journal, article, about, contact, and a fallback 404. Customer state is local/demo-oriented, with catalog hydration from `/api/catalog` and a seed fallback.

## Baseline validation

`pnpm check` passed. `pnpm test -- --run` passed with 4 test files and 32 tests.

## Homepage browser inspection at http://127.0.0.1:4177/

The existing visual identity is editorial and material-focused, using charcoal, parchment, warm neutral, rust, Playfair Display, and DM Sans. The homepage has a strong above-the-fold hero CTA, featured edit links, a product rail, editorial links, collection tiles, a local-demo explanation, newsletter signup, and footer navigation. The desktop viewport rendered without visible horizontal overflow.

Observed gaps to verify or improve include: no skip-to-content link; no cookie banner; footer Privacy and Terms links route to About/Contact rather than dedicated legal pages; no visible back-to-top, scroll progress, floating contact, FAQ, copy button, or last-updated utility; the hero play control is a non-functional unlabeled span; no explicit global focus styling beyond form controls; product cards show only current price and no availability or compare-at/promotion messaging; catalog loading state is not surfaced; the header has a sticky behavior but no explicit accessibility or scroll-state announcement; and metadata is static in `client/index.html` with no canonical URL or `og:image`, while robots/sitemap assets are absent.

The storefront includes reduced-motion CSS, mobile drawer navigation, local form success/error behavior for newsletter and contact, checkout validation/payment-state recovery, custom 404, responsive grids, and accessible wishlist labels/pressed state. These should be preserved rather than replaced.

## Source evidence

- `client/src/components/Storefront.tsx`: shared header, mobile drawer, footer, newsletter, and layout.
- `client/src/pages/CommercePages.tsx`: public page implementations, cart/checkout/contact/404/confirmation.
- `client/src/lib/commerce.tsx`: local state, API catalog loading, fallback behavior.
- `client/src/components/ProductCard.tsx`: product card imagery, wishlist control, quick-view link, current price.
- `client/src/pages/Home.tsx`: homepage composition and CTAs.
- `client/src/index.css`: current responsive breakpoints and reduced-motion override.
- `client/index.html`: static title/description/Open Graph title/description/type, inline favicon, optional Umami analytics loader, and viewport `maximum-scale=1`.

## Scope

Only customer-facing storefront files may be changed. Admin/CMS code and architecture must remain untouched except for a backend change that is technically necessary for a storefront requirement; none is currently indicated.
