# Admin CMS Architecture

## Scope

The merchant control panel extends the existing Express, Drizzle, MySQL-compatible, React, and Wouter application. It does not replace the storefront, the current payment boundary, the existing commerce service, or the GitHub Pages deployment. The public customer experience remains the default route tree; merchant operations live under `/admin` and use server-side `/api/admin/*` endpoints.

## Trust boundaries

Every administrative request follows the same order: session authentication, server-side role authorization, Zod validation, domain rule enforcement, database or demo-store mutation, and audit-event recording. Browser visibility is only a usability concern; it is never the source of authorization.

| Boundary | Responsibility | Source of truth |
| --- | --- | --- |
| Browser admin UI | Navigation, forms, loading and empty states, optimistic presentation only | Server responses |
| Admin API | Authentication, RBAC, validation, business rules, audit writes | Server domain services |
| Catalog tables | Product and collection persistence when a database is available | MySQL/TiDB via Drizzle |
| Admin tables | Categories, promotions, banners, inventory adjustments, audit events | MySQL/TiDB via Drizzle |
| Demo fallback | Deterministic in-process store when `DATABASE_URL` is absent | Explicitly demo-only memory state |
| Storefront | Customer-facing rendering and checkout boundary | `/api/catalog` when available, static catalog fallback otherwise |

## Roles

The existing `users.role` field is extended with the merchant roles `owner`, `admin`, and `staff`. Existing non-merchant values remain denied from `/admin`.

| Capability | OWNER | ADMIN | STAFF |
| --- | ---: | ---: | ---: |
| Dashboard | Yes | Yes | Yes |
| Products | Full | Full | Limited update/read |
| Categories | Yes | Yes | No |
| Inventory | Yes | Yes | Yes |
| Promotions | Yes | Yes | No |
| Banners | Yes | Yes | No |
| Orders | Yes | Yes | Yes |
| Customers | Yes | Yes | Limited read |
| Staff | Yes | No | No |
| Audit log | Yes | Yes | Limited read |
| Settings | Yes | Limited | No |

The role is checked against the authenticated server session and, when a database is configured, the current `users.role` row. An owner session may be identified by the existing owner flag; no browser-provided role is trusted.

## Admin route map

| Route | Purpose |
| --- | --- |
| `/admin` | Operational dashboard |
| `/admin/products` | Product search, filters, create/edit/archive |
| `/admin/categories` | Category create/edit/archive and visibility |
| `/admin/inventory` | Stock review and reasoned adjustments |
| `/admin/promotions` | Sale creation, scheduling, activation, and deactivation |
| `/admin/banners` | Homepage banner creation, scheduling, activation, and ordering |
| `/admin/orders` | Order lookup and permitted fulfillment transitions |
| `/admin/customers` | Customer lookup and order history summary |
| `/admin/staff` | Owner-only staff role management |
| `/admin/audit` | Administrative event history |
| `/admin/settings` | Read-only operational boundary and environment status |

## API surface

The API is RESTful because the existing repository uses Express route handlers rather than a generated RPC layer. Operational rows expose only the actions supported by the server contract: fulfillment transitions for orders and role updates for owner-authorized staff management. Settings is intentionally read-only.

| Endpoint family | Operations |
| --- | --- |
| `/api/admin/bootstrap` | Current actor, allowed navigation, dashboard metrics |
| `/api/admin/products` | List, create, update, archive |
| `/api/admin/categories` | List, create, update, archive |
| `/api/admin/inventory` | List stock and create reasoned adjustments |
| `/api/admin/promotions` | List, create, update, activate/deactivate |
| `/api/admin/banners` | List, create, update, activate/deactivate, reorder |
| `/api/admin/orders` | List, detail, permitted fulfillment transitions |
| `/api/admin/customers` | List and order-history summary |
| `/api/admin/staff` | Owner-only list and role updates |
| `/api/admin/audit` | Role-filtered immutable event list |
| `/api/admin/settings` | Non-sensitive persistence, environment, catalog, and payment diagnostics |

## Persistence and migration strategy

The existing hand-maintained migration bootstrap remains the migration authority. New tables are additive and idempotent. Products continue to use `catalog_products`; categories are represented by an additive admin category table and mapped to the existing product payload. Promotions and banners are separate entities so scheduling and audit history do not become duplicated JSON-only state. Inventory adjustments and audit events are append-only records.

When no database is configured, the same domain API runs against an explicit in-memory demo store seeded from the existing eight-product catalog. This keeps the admin shell demonstrable in local and Pages-style frontend environments without implying persistence. A configured database is required for real merchant operations.

## Storefront synchronization

The server catalog response is extended with published categories, promotions, and banners. The client hydrates the existing catalog arrays in place after a successful `/api/catalog` request, preserving the current static fallback when the backend is absent. The homepage uses the first active banner when one is published; otherwise it retains the original editorial hero. Product prices and stock are derived from the server catalog response, so the storefront does not maintain a second authoritative catalog.

## Production boundary

The admin frontend may be built with the storefront, but GitHub Pages remains a static frontend host. Authentication, authorization, database writes, inventory integrity, promotion pricing, media storage, and audit logging remain server responsibilities. The project classification therefore remains **CLIENT DEMO READY** until the production blockers listed in `docs/production-readiness.md` are independently provisioned and verified.
