/**
 * Safely extract the client IP address from a request.
 *
 * Priority:
 * 1. CF-Connecting-IP  — set by Cloudflare, cannot be injected by clients
 * 2. X-Real-IP         — set by a single trusted reverse proxy (e.g. Nginx)
 * 3. Rightmost entry in X-Forwarded-For — avoids client-controlled leftmost entries
 *
 * When the server is deployed behind a trusted proxy, ensure the proxy
 * overwrites X-Real-IP (or rely on CF-Connecting-IP for Cloudflare).
 */
export function getClientIp(req: Request): string {
  const h = req.headers;

  // Cloudflare — reliable when traffic flows through CF edge
  const cfIp = h.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  // Nginx / trusted proxy — single value not forwarded from the client
  const realIp = h.get("x-real-ip");
  if (realIp) return realIp.trim();

  // Rightmost entry in X-Forwarded-For is set by the nearest proxy,
  // making it harder to spoof than the leftmost client-controlled entry.
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",");
    const last = parts[parts.length - 1].trim();
    if (last) return last;
  }

  return "anon";
}
