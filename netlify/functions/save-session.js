import { getSql, json, toNum } from "./_db.js";

// Public endpoint: the candidate app posts a completed interview here so the
// report is persisted even if the candidate closes their tab.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    candidateName,
    role,
    plEmail,
    average,
    fluidity,
    sentiment,
    questionCount,
    data,
    reportHtml,
  } = body || {};

  if (!data) return json({ error: "Missing 'data'" }, 400);

  try {
    const sql = getSql();
    const rows = await sql`
      insert into sessions
        (candidate_name, role, pl_email, average, fluidity, sentiment, question_count, data, report_html)
      values
        (${candidateName || null}, ${role || null}, ${plEmail || null},
         ${toNum(average)}, ${toNum(fluidity)}, ${sentiment || null},
         ${questionCount || null}, ${JSON.stringify(data)}::jsonb, ${reportHtml || null})
      returning id, created_at
    `;
    return json({ ok: true, id: rows[0].id, createdAt: rows[0].created_at });
  } catch (e) {
    console.error("save-session failed:", e);
    return json({ error: e.message }, 500);
  }
};

export const config = { path: "/api/save-session" };
