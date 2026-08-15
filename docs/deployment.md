# Deployment

## Current deployment

The verified public frontend is deployed at [https://usamabhanbhro.github.io/e-commerce/](https://usamabhanbhro.github.io/e-commerce/). The repository uses GitHub Actions rather than the legacy branch-based Pages publisher.

| Property | Current behavior |
| --- | --- |
| Source branch | `main` |
| Workflow | `.github/workflows/deploy-pages.yml` |
| Build command | `pnpm build:pages` |
| Artifact | `dist/public` |
| Static host | GitHub Pages |
| Project base path | `/e-commerce/` |
| Client-side fallback | Deployment-only `404.html` copied from `index.html` |
| Backend | Not hosted by GitHub Pages |
| HTTPS | Enforced on the configured Pages site |

## Workflow sequence

A push to `main`, or a manual workflow dispatch, runs the following sequence:

1. Check out the repository.
2. Install pnpm 10.34.5 and Node.js 22.
3. Configure the Pages project and obtain the repository base path.
4. Install the committed dependency graph with `pnpm install --frozen-lockfile`.
5. Run the existing `pnpm build:pages` command with `VITE_PAGES_BASE_PATH` set from the Pages configuration.
6. Copy the generated `index.html` to `dist/public/404.html` for the existing Wouter client-side route surface.
7. Upload `dist/public` through the Pages artifact action.
8. Deploy the artifact through the `github-pages` environment.

No generated build directory is committed. The workflow has least-privilege read permissions for the build job and Pages deployment permissions only on the deploy job. Concurrency cancels superseded deployments so an older push does not race a newer one.

## Project base path

Vite uses `/` for ordinary local and server builds. When `GITHUB_PAGES=true`, the configuration reads `VITE_PAGES_BASE_PATH`; the workflow supplies the value returned by `actions/configure-pages`. For this repository, the result is `/e-commerce/`, so entry HTML and static asset references resolve correctly from the project site rather than the domain root.

This behavior must be preserved if the repository name changes. Do not hard-code a domain root or remove the Pages output value from the workflow.

## Client-side routing

GitHub Pages is a static host and does not rewrite unknown paths to `index.html` with a successful server status. The workflow therefore creates `404.html` in the deployment artifact. Direct navigation to a route such as `/e-commerce/shop` returns the application shell through GitHub Pages’ fallback behavior; the browser-side Wouter router then resolves the route.

The fallback is intentionally generated during deployment. It must not be checked into the repository as a second generated copy of the frontend entry document.

## Deployment verification

After a deployment, verify the following without entering real credentials:

```bash
curl --fail --silent --show-error https://usamabhanbhro.github.io/e-commerce/
curl --fail --silent --show-error https://usamabhanbhro.github.io/e-commerce/404.html
```

Then use a browser to confirm that the root page renders, asset requests resolve under `/e-commerce/assets/`, the `/e-commerce/shop` fallback returns the application shell, and the client-side router renders the catalog route. Inspect the browser console and network panel for failed static resources or accidental local API references.

The deployment verification completed successfully for the current candidate. The workflow run is recorded in the repository’s Actions history and the live root returned the expected entry HTML and project-prefixed asset references.

## Custom domain readiness

No custom domain is currently configured and no `CNAME` file has been invented. When a real domain is selected:

1. Configure the domain in **Repository Settings → Pages → Custom domain**.
2. Add the DNS record at the domain provider: GitHub’s documented A/AAAA records for an apex domain or a CNAME to the owner’s GitHub Pages hostname for a subdomain.
3. Wait for GitHub’s DNS verification and certificate issuance.
4. Enable HTTPS enforcement after the certificate is available.
5. Repeat root, asset, route-fallback, and security scans against the custom domain.

The custom-domain setup is an external deployment prerequisite and is not a reason to change the working project-site architecture.

## Backend deployment boundary

GitHub Pages serves only `dist/public`. The Express API, MySQL/MariaDB database, OAuth provider, official payment adapter, S3-compatible storage, scheduled backups, WAF/edge layer, monitoring, alerting, and distributed rate limiting require separate infrastructure. A successful Pages deployment is evidence of frontend delivery, not evidence that live commerce is operational.
