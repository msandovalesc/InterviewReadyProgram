import { neon } from "@neondatabase/serverless";

let _sql;

// Lazily create the Neon client so a missing env var surfaces as a clean
// 500 at request time instead of a crash on cold start.
export function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Fail closed: the admin endpoints expose candidate data, so if no
// ADMIN_TOKEN is configured we refuse rather than serve it openly.
// Returns null when authorized, or a Response to return otherwise.
export function checkAdmin(req) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return json({ error: "ADMIN_TOKEN is not configured on the server" }, 500);
  }
  const header = req.headers.get("authorization") || "";
  const provided = header.replace(/^Bearer\s+/i, "").trim();
  if (provided !== token) {
    return json({ error: "Unauthorized" }, 401);
  }
  return null;
}

export function toNum(v) {
  if (v === null || v === undefined) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
