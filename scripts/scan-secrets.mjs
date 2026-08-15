import { execFileSync } from "node:child_process";
import fs from "node:fs";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
const forbidden = [
  /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) KEY-----/i,
  /AKIA[0-9A-Z]{16}/,
  /(?:api[_-]?key|secret|token)\s*[:=]\s*["'][^"']{20,}["']/i,
];
const legacy = /(?:old-brand-name|old-brand|placeholder-secret-value)/i;
const localRuntime = /(?:APP_ENV|NODE_ENV)\s*=\s*development|(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?/i;
const violations = [];
const productionScanExcluded = (file) => file === ".env.example" || file === "docker-compose.staging.yml" || file.startsWith("docs/") || file.startsWith("tests/") || file.startsWith(".github/") || ["playwright.config.ts", "vite.config.ts", "drizzle.config.ts"].includes(file);
for (const file of files) {
  if (file === "scripts/scan-secrets.mjs" || file.endsWith(".png") || file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".woff2")) continue;
  let content = "";
  try { content = fs.readFileSync(file, "utf8"); } catch { continue; }
  if (forbidden.some((pattern) => pattern.test(content))) violations.push(`${file}: secret-like pattern`);
  if (legacy.test(content)) violations.push(`${file}: forbidden legacy marker`);
  if (!productionScanExcluded(file) && localRuntime.test(content)) violations.push(`${file}: local development runtime marker`);
}
if (violations.length) { console.error(violations.join("\n")); process.exit(1); }
console.log(`scan passed: ${files.length} files`);
