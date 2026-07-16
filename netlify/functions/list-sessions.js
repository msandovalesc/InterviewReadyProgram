import { getSql, json, checkAdmin } from "./_db.js";

// Admin endpoint: list every stored session (lightweight columns only —
// the heavy report_html/data are fetched per-session via /api/session).
export default async (req) => {
  const denied = checkAdmin(req);
  if (denied) return denied;

  try {
    const sql = getSql();
    const rows = await sql`
      select id, created_at, candidate_name, role, pl_email,
             average, fluidity, sentiment, question_count
      from sessions
      order by created_at desc
      limit 500
    `;
    return json({ sessions: rows });
  } catch (e) {
    console.error("list-sessions failed:", e);
    return json({ error: e.message }, 500);
  }
};

export const config = { path: "/api/sessions" };
