// Minimal in-process sliding-window limiter for the public endpoints.
// Single-instance deployment, so a Map is sufficient (swap for Redis if
// the app ever scales horizontally).
const hits = new Map<string, number[]>();

export function rateLimit(req: Request, bucket: string, max: number, windowSec: number): boolean {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 10_000) {
    // shed old buckets so the map can't grow unbounded
    for (const [k, v] of hits) if (v.every((t) => now - t > windowMs)) hits.delete(k);
  }
  return true;
}
