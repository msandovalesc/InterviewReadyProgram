import { useState, useEffect } from "react";
import { API_BASE } from "../constants";

const TOKEN_KEY = "irp_admin_token";

export default function AdminScreen() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const authed = !!token;

  useEffect(() => {
    if (authed) loadSessions(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function loadSessions(tok) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.status === 401) {
        setError("Incorrect admin password.");
        clearToken();
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const body = await res.json();
      setSessions(body.sessions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function saveToken(tok) {
    sessionStorage.setItem(TOKEN_KEY, tok);
    setToken(tok);
  }

  function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setSessions([]);
  }

  async function fetchFullSession(id) {
    const res = await fetch(`${API_BASE}/session?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${res.status})`);
    }
    const body = await res.json();
    return body.session;
  }

  async function withReport(id, fn) {
    setBusyId(id);
    setError("");
    try {
      const session = await fetchFullSession(id);
      if (!session?.report_html) {
        setError("This session has no stored report.");
        return;
      }
      fn(session);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  function openReport(id) {
    withReport(id, (session) => {
      const blob = new Blob([session.report_html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    });
  }

  function downloadReport(id) {
    withReport(id, (session) => {
      const name = (session.candidate_name || session.role || "Candidate").replace(/\s+/g, "_");
      const date = new Date(session.created_at).toISOString().slice(0, 10);
      const blob = new Blob([session.report_html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Interview_Report_${name}_${date}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  async function deleteSession(s) {
    const who = s.candidate_name || s.role || "this session";
    const when = fmtDate(s.created_at);
    if (!window.confirm(`Permanently delete the saved report for ${who} (${when})?\n\nThis cannot be undone.`)) {
      return;
    }
    setBusyId(s.id);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/delete-session?id=${encodeURIComponent(s.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      setSessions((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  function fmtDate(d) {
    return new Date(d).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  // ---- Login gate ----
  if (!authed) {
    return (
      <div className="screen" style={{ maxWidth: 420, margin: "0 auto" }}>
        <div className="report-header" style={{ marginBottom: 24 }}>
          <div className="report-header-left">
            <img src="/psl-icon.svg" alt="Unosquare" className="report-logo" />
            <div>
              <h1 className="report-title">Interview Ready Program</h1>
              <p className="report-subtitle">Admin — Saved Sessions</p>
            </div>
          </div>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (input.trim()) saveToken(input.trim()); }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label style={{ fontSize: 14, fontWeight: 600 }}>Admin password</label>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter admin token"
            autoFocus
            style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}
          />
          <button className="btn btn-primary" type="submit">Sign in</button>
          {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}
        </form>
      </div>
    );
  }

  // ---- Session list ----
  return (
    <div className="screen">
      <div className="report-header" style={{ marginBottom: 16 }}>
        <div className="report-header-left">
          <img src="/psl-icon.svg" alt="Unosquare" className="report-logo" />
          <div>
            <h1 className="report-title">Interview Ready Program</h1>
            <p className="report-subtitle">Admin — Saved Sessions</p>
          </div>
        </div>
        <div className="report-header-right">
          <button className="btn" onClick={() => loadSessions(token)}>↻ Refresh</button>
          <button className="btn btn-secondary" onClick={clearToken} style={{ marginLeft: 8 }}>Sign out</button>
        </div>
      </div>

      {error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      {loading && <p style={{ color: "#6b7280" }}>Loading sessions…</p>}

      {!loading && sessions.length === 0 && (
        <p style={{ color: "#9ca3af" }}>No saved sessions yet.</p>
      )}

      {!loading && sessions.length > 0 && (
        <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#f9fafb", color: "#6b7280" }}>
                <th style={th}>Date</th>
                <th style={th}>Candidate</th>
                <th style={th}>Role</th>
                <th style={th}>Avg</th>
                <th style={th}>Fluidity</th>
                <th style={th}>Sentiment</th>
                <th style={th}>Qs</th>
                <th style={th}>Report</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={td}>{fmtDate(s.created_at)}</td>
                  <td style={td}>{s.candidate_name || "—"}</td>
                  <td style={td}>{s.role || "—"}</td>
                  <td style={td}>{s.average != null ? `${s.average}/10` : "—"}</td>
                  <td style={td}>{s.fluidity != null ? `${s.fluidity}/10` : "—"}</td>
                  <td style={td}>{s.sentiment || "—"}</td>
                  <td style={td}>{s.question_count ?? "—"}</td>
                  <td style={td}>
                    <button className="btn" disabled={busyId === s.id} onClick={() => openReport(s.id)}>
                      {busyId === s.id ? "…" : "Open"}
                    </button>
                    <button
                      className="btn btn-secondary"
                      disabled={busyId === s.id}
                      onClick={() => downloadReport(s.id)}
                      style={{ marginLeft: 6 }}
                    >
                      Download
                    </button>
                  </td>
                  <td style={td}>
                    <button
                      className="btn"
                      disabled={busyId === s.id}
                      onClick={() => deleteSession(s)}
                      style={{ color: "#dc2626", borderColor: "#fecaca" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { padding: "10px 12px", fontWeight: 600, whiteSpace: "nowrap" };
const td = { padding: "10px 12px", whiteSpace: "nowrap" };
