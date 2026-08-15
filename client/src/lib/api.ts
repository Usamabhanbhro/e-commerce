const configuredBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");

export const apiBaseUrl = configuredBase;

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) return `${configuredBase}/${path}`;
  return `${configuredBase}${path}`;
}
