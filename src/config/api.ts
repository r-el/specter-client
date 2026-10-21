/**
 * Resolves the base API and Socket.IO URL with safe fallback in production.
 *
 * If VITE_API_BASE_URL was provided at build time, it is respected.
 * Otherwise, if running in a browser outside localhost, it falls back to window.location.origin
 * rather than hardcoding localhost:12113.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, "");
  }

  if (
    typeof window !== "undefined" &&
    window.location.hostname &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    if (window.location.hostname.endsWith("eyec.live")) {
      return "https://api.eyec.live";
    }
    return window.location.origin;
  }

  return "http://localhost:12113";
}
