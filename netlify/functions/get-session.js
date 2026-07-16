import { getSql, json, checkAdmin } from "./_db.js";

// Admin endpoint: fetch one full session (including the stored report HTML)
// so it can be viewed or downloaded. Usage: /api/session?id=<uuid>
export default async (req) => {
  const denied = checkAdmin(req);
  if (denied) return denied;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ error: "Missing 'id' query parameter" }, 400);

  try {
    const sql = getSql();
    const rows = await sql`select * from sessions where id = ${id}`;
    if (rows.length === 0) return json({ error: "Not found" }, 404);
    return json({ session: rows[0] });
  } catch (e) {
    console.error("get-session failed:", e);
    return json({ error: e.message }, 500);
  }
};

export const config = { path: "/api/session" };
