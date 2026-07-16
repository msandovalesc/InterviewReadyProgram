import { getSql, json, checkAdmin } from "./_db.js";

// Admin endpoint: permanently delete one stored session.
// Usage: DELETE /api/delete-session?id=<uuid>
export default async (req) => {
  const denied = checkAdmin(req);
  if (denied) return denied;

  if (req.method !== "DELETE" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ error: "Missing 'id' query parameter" }, 400);

  try {
    const sql = getSql();
    const rows = await sql`delete from sessions where id = ${id} returning id`;
    if (rows.length === 0) return json({ error: "Not found" }, 404);
    return json({ ok: true, id: rows[0].id });
  } catch (e) {
    console.error("delete-session failed:", e);
    return json({ error: e.message }, 500);
  }
};

export const config = { path: "/api/delete-session" };
