# Visual Regression Audit

**Audit target:** `081bef6` (`Complete merchant CMS workflows`)

**Approved comparison point:** `77690ad492ec65092192e73ed5b8a61c91edfa60`

## Findings

The initial reproduction identified exactly two failures in `tests/e2e/visual.spec.ts`:

1. `reconstructed storefront visual baselines › home-desktop`
2. `reconstructed storefront visual baselines › home-mobile`

The other ten visual surfaces passed.

The first mobile comparison was `390x7463` for the approved image versus `390x7207` for the current capture. The current capture omitted below-fold lazy-loaded editorial images, creating an apparent 256-pixel page-height difference. The homepage source already used lazy loading at the approved comparison point. The CMS implementation did not modify `Home.tsx`, `CommercePages.tsx`, `index.css`, navigation, product-card markup, or responsive storefront CSS. This portion was classified as **C: environment/rendering difference caused by nondeterministic lazy-image capture**.

After the visual fixture was made deterministic by eagerly loading and awaiting every document image before the full-page screenshot, the current mobile page matched the approved baseline dimensions. The remaining differences were localized to the three collection-strip images. The approved baseline contained the collection labels over an empty warm-paper area, while the current runtime rendered the intended existing seed collection images in the correct order and dimensions. The current source and collection seed data were unchanged between the approved comparison point and `081bef6`; these are not CMS-managed records. This portion was classified as **D: outdated visual baseline**.

No evidence indicated an actual regression in storefront layout, homepage structure, mobile responsiveness, product cards, navigation, typography, spacing, banner rendering, product rendering, or category rendering.

## Remediation

Only the two affected approved snapshots were regenerated:

- `tests/e2e/visual.spec.ts-snapshots/home-desktop-chromium-linux.png`
- `tests/e2e/visual.spec.ts-snapshots/home-mobile-chromium-linux.png`

The visual fixture now loads all page images deterministically before capture. No storefront source, CMS functionality, database architecture, R2 configuration, OAuth boundary, production infrastructure, or staging workflow was changed.

## Validation

The complete visual suite passed with **12/12** tests. The full Playwright suite passed with **64 tests**, and the focused merchant-admin suite passed with **6 tests**. Type-check, lint, unit tests (**32/32**), production build, GitHub Pages build, production dependency audit, and release secret scan also passed.
