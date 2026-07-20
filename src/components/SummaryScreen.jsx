import { useState, useEffect } from "react";
import { evaluateAnswer } from "../utils/evaluateAnswer";
import { getCriteriaForQuestion } from "../utils/evaluationCriteria";
import { scoreColor } from "../utils/scoreColor";
import { FLOW_URL } from "../constants";

function sentimentIcon(s) {
  if (s === "Positive") return { emoji: "😊", cls: "sentiment-positive" };
  if (s === "Negative") return { emoji: "😟", cls: "sentiment-negative" };
  if (s === "Mixed") return { emoji: "😐", cls: "sentiment-mixed" };
  return { emoji: "😶", cls: "sentiment-neutral" };
}

export default function SummaryScreen({
  answers,
  questions,
  role,
  candidateName,
  isCandidate,
  plEmail,
  modelStatus,
  onNewInterview,
  onRetry,
}) {
  const [evaluations, setEvaluations] = useState([]);
  const [evaluatingIdx, setEvaluatingIdx] = useState(0);
  const [emailSent, setEmailSent] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [copied, setCopied] = useState(false);
  // "idle" | "sending" | "sent" | "error"
  const [sendStatus, setSendStatus] = useState("idle");

  useEffect(() => {
    let cancelled = false;

    async function runEvaluations() {
      const results = [];
      for (let i = 0; i < answers.length; i++) {
        if (cancelled) return;
        setEvaluatingIdx(i);
        try {
          const result = await evaluateAnswer({
            question: answers[i].question,
            transcript: answers[i].transcript,
            role,
            onDownloadProgress: (pct) => setDownloadProgress(pct),
          });
          results.push(result);
        } catch {
          results.push({
            error: true,
            summary: "Evaluation failed for this question.",
            score: 0,
            fluidity: 0,
            label: "N/A",
            sentiment: "Neutral",
            highlight: "",
            strengths: [],
            improvements: [],
          });
        }
        setDownloadProgress(null);
        if (!cancelled) setEvaluations([...results]);
      }
      if (!cancelled) setIsDone(true);
    }

    runEvaluations();
    return () => { cancelled = true; };
  }, [answers, role]);

  useEffect(() => {
    if (!isDone || !isCandidate || emailSent) return;
    setEmailSent(true);
    if (FLOW_URL && plEmail) {
      sendHtmlToFlow();
    }
  }, [isDone, isCandidate, emailSent, plEmail]);

  const validScores = evaluations.filter((ev) => !ev.error && ev.score);
  const avg =
    validScores.length > 0
      ? (validScores.reduce((a, ev) => a + ev.score, 0) / validScores.length).toFixed(1)
      : "—";
  const avgNum = parseFloat(avg);

  const fluidityScores = validScores.filter((ev) => ev.fluidity);
  const avgFluidity =
    fluidityScores.length > 0
      ? (fluidityScores.reduce((a, ev) => a + ev.fluidity, 0) / fluidityScores.length).toFixed(1)
      : "—";
  const avgFluidityNum = parseFloat(avgFluidity);

  const totalReRecords = answers.reduce((sum, a) => sum + (a.reRecords || 0), 0);

  const scoreDistribution = {
    excellent: validScores.filter((ev) => ev.score >= 8).length,
    good: validScores.filter((ev) => ev.score >= 5 && ev.score < 8).length,
    needsWork: validScores.filter((ev) => ev.score < 5).length,
  };

  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function barWidth(score) {
    return `${(score / 10) * 100}%`;
  }

  function barColor(score) {
    const c = scoreColor(score);
    if (c === "success") return "var(--color-success)";
    if (c === "warning") return "var(--color-warning)";
    return "var(--color-danger)";
  }

  const overallSentiment = (() => {
    const sentiments = validScores.map((ev) => ev.sentiment).filter(Boolean);
    if (!sentiments.length) return "Neutral";
    const pos = sentiments.filter((s) => s === "Positive").length;
    const neg = sentiments.filter((s) => s === "Negative").length;
    if (pos > sentiments.length / 2) return "Positive";
    if (neg > sentiments.length / 2) return "Negative";
    if (pos > 0 && neg > 0) return "Mixed";
    return "Neutral";
  })();

  const highlights = validScores
    .map((ev, i) => ev.highlight ? { q: i + 1, text: ev.highlight } : null)
    .filter(Boolean);

  const allStrengths = validScores.flatMap((ev) => ev.strengths || []);
  const allImprovements = validScores.flatMap((ev) => ev.improvements || []);
  const topStrengths = [...new Set(allStrengths)].slice(0, 5);
  const topImprovements = [...new Set(allImprovements)].slice(0, 5);

  const handlePrint = () => window.print();

  const handleCopyReport = async () => {
    const lines = [
      "INTERVIEW READY PROGRAM — EVALUATION REPORT",
      "",
      candidateName ? `Candidate: ${candidateName}` : "",
      `Date:      ${now}`,
      `Role:      ${role || "Software Engineer"}`,
      `Questions: ${questions.length}`,
      `Average:   ${avg}/10`,
      `Fluidity:  ${avgFluidity}/10 (avg)`,
      `Sentiment: ${overallSentiment}`,
      totalReRecords > 0 ? `Re-records: ${totalReRecords} total` : "",
      "",
      "─".repeat(50),
    ];

    answers.forEach((a, i) => {
      const ev = evaluations[i];
      lines.push("");
      lines.push(`Q${i + 1}: ${a.question}`);
      if (a.reRecords > 0) lines.push(`   ⚠ Re-recorded ${a.reRecords} time${a.reRecords !== 1 ? "s" : ""}`);
      lines.push(`   Answer: "${a.transcript}"`);
      if (ev && !ev.error) {
        lines.push(`   Score: ${ev.score}/10 (${ev.label})`);
        lines.push(`   Fluidity: ${ev.fluidity ?? "—"}/10`);
        lines.push(`   Sentiment: ${ev.sentiment}`);
        if (ev.highlight) lines.push(`   Highlight: "${ev.highlight}"`);
        lines.push(`   ${ev.summary}`);
        lines.push(`   Strengths: ${ev.strengths?.join("; ")}`);
        lines.push(`   To improve: ${ev.improvements?.join("; ")}`);
      } else {
        lines.push(`   Score: N/A`);
      }
      lines.push("─".repeat(50));
    });

    lines.push("");
    lines.push("Generated by Interview Ready Program — Unosquare");
    await navigator.clipboard.writeText(lines.filter((l) => l !== undefined).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailReport = () => {
    window.open(buildMailtoLink());
  };

  const buildMailtoLink = () => {
    const subject = encodeURIComponent(`Interview Report — ${candidateName ? `${candidateName} — ` : ""}${role || "Software Engineer"} — ${now}`);
    const bodyLines = [
      "Interview Ready Program — Evaluation Report",
      "",
      candidateName ? `Candidate: ${candidateName}` : "",
      `Date: ${now}`,
      `Role: ${role || "Software Engineer"}`,
      `Questions: ${questions.length}`,
      `Average Score: ${avg}/10`,
      `Average Fluidity: ${avgFluidity}/10`,
      `Sentiment: ${overallSentiment}`,
      "",
    ];
    answers.forEach((a, i) => {
      const ev = evaluations[i];
      bodyLines.push(`--- Question ${i + 1} ---`);
      bodyLines.push(a.question);
      bodyLines.push(`Answer: "${a.transcript}"`);
      if (ev && !ev.error) {
        bodyLines.push(`Score: ${ev.score}/10 (${ev.label}) | Fluidity: ${ev.fluidity ?? "—"}/10 | Sentiment: ${ev.sentiment}`);
        if (ev.highlight) bodyLines.push(`Highlight: "${ev.highlight}"`);
        bodyLines.push(ev.summary);
        bodyLines.push(`Strengths: ${ev.strengths?.join("; ")}`);
        bodyLines.push(`To improve: ${ev.improvements?.join("; ")}`);
      }
      bodyLines.push("");
    });
    bodyLines.push("Generated by Interview Ready Program — Unosquare");
    const body = encodeURIComponent(bodyLines.join("\n"));
    return `mailto:${plEmail}?subject=${subject}&body=${body}`;
  };

  const handleSendToPL = () => {
    const subject = encodeURIComponent(`Interview Report — ${candidateName ? `${candidateName} — ` : ""}${role || "Software Engineer"} — ${now}`);
    const body = encodeURIComponent(`Hi,\n\nPlease find ${candidateName ? `${candidateName}'s` : "my"} interview evaluation report attached as a PDF.\n\nThank you.`);
    window.open(`mailto:${plEmail}?subject=${subject}&body=${body}`);
  };

  // Word-conversion-safe report (table-based layout, solid colors).
  // Used ONLY for the PDF the Power Automate flow generates (Word's HTML->PDF
  // engine mangles flexbox/grid/gradients, so this version uses tables).
  const buildReportHtmlForPdf = () => {
    const withPrintButton = false;
    const gaugeColor = (score) => {
      if (score >= 8) return "#16a34a";
      if (score >= 5) return "#d97706";
      return "#dc2626";
    };
    const labelBg = (score) => (score >= 8 ? "#dcfce7" : score >= 5 ? "#fef3c7" : "#fee2e2");
    const labelFg = (score) => (score >= 8 ? "#16a34a" : score >= 5 ? "#d97706" : "#dc2626");
    const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Horizontal bar rendered with nested tables (Word-safe).
    const bar = (label, count, color) => {
      const pct = questions.length ? Math.round((count / questions.length) * 100) : 0;
      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:5px 0;"><tr>
          <td width="120" style="font-size:12px;color:#6b7280;">${label}</td>
          <td>
            <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#e5e7eb" style="background:#e5e7eb;"><tr>
              <td width="${pct}%" height="8" bgcolor="${color}" style="background:${color};font-size:1px;line-height:8px;">&nbsp;</td>
              <td height="8" style="font-size:1px;line-height:8px;">&nbsp;</td>
            </tr></table>
          </td>
          <td width="28" align="right" style="font-size:12px;font-weight:bold;">${count}</td>
        </tr></table>`;
    };

    const card = (inner) =>
      `<tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid #e5e7eb;padding:20px;">${inner}</td></tr><tr><td height="16" style="font-size:1px;line-height:16px;">&nbsp;</td></tr>`;

    const sectionTitle = (t, color) =>
      `<div style="font-size:16px;font-weight:bold;color:${color || "#191919"};border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:12px;">${t}</div>`;

    const questionsHTML = answers.map((a, i) => {
      const ev = evaluations[i];
      const sc = ev && !ev.error ? ev.score : 0;
      const sentInfo = ev ? sentimentIcon(ev.sentiment) : sentimentIcon("Neutral");
      const criteria = getCriteriaForQuestion(a.question);
      const lookFor = `
          <div style="background:#e8efff;border:1px solid #2550f9;padding:12px 16px;margin-bottom:12px;">
            <div style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#0522DE;margin-bottom:6px;">What a strong answer includes</div>
            <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#4b5563;">${criteria.greenFlags.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
          </div>`;
      const scoreRow = ev && !ev.error ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
            <td width="64" valign="top">
              <table cellpadding="0" cellspacing="0"><tr>
                <td width="56" height="56" align="center" valign="middle" bgcolor="${gaugeColor(sc)}" style="background:${gaugeColor(sc)};color:#ffffff;font-size:20px;font-weight:bold;">${sc}<span style="font-size:11px;">/10</span></td>
              </tr></table>
            </td>
            <td valign="middle" style="padding-left:14px;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#e5e7eb" style="background:#e5e7eb;"><tr>
                    <td width="${sc * 10}%" height="8" bgcolor="${gaugeColor(sc)}" style="background:${gaugeColor(sc)};font-size:1px;line-height:8px;">&nbsp;</td>
                    <td height="8" style="font-size:1px;line-height:8px;">&nbsp;</td>
                  </tr></table>
                </td>
              </tr></table>
            </td>
            <td width="100" align="right" valign="middle">
              <span style="font-size:12px;font-weight:bold;color:${labelFg(sc)};background:${labelBg(sc)};padding:4px 10px;">${esc(ev.label)}</span>
            </td>
          </tr></table>
          <div style="font-size:13px;color:#6b7280;margin-bottom:8px;"><strong>Fluidity:</strong> ${ev.fluidity ?? "—"}/10</div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:12px;"><strong>${sentInfo.emoji} Sentiment:</strong> ${esc(ev.sentiment)}${ev.highlight ? ` &nbsp;—&nbsp; <em>"${esc(ev.highlight)}"</em>` : ""}</div>` : "";

      const reRecordBanner = a.reRecords > 0
        ? `<div style="background:#fef3c7;border:1px solid #d97706;color:#d97706;padding:8px 14px;font-size:13px;margin-bottom:12px;">&#9888; Re-recorded ${a.reRecords} time${a.reRecords !== 1 ? "s" : ""}</div>`
        : "";

      const feedback = ev && !ev.error ? `
          <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 12px;">${esc(ev.summary)}</p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="50%" valign="top" style="padding-right:10px;">
              <div style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#16a34a;margin-bottom:6px;">Strengths</div>
              <ul style="margin:0;padding-left:18px;font-size:13px;color:#6b7280;line-height:1.6;">${(ev.strengths || []).map(s => `<li>${esc(s)}</li>`).join("")}</ul>
            </td>
            <td width="50%" valign="top" style="padding-left:10px;">
              <div style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#d97706;margin-bottom:6px;">Areas to improve</div>
              <ul style="margin:0;padding-left:18px;font-size:13px;color:#6b7280;line-height:1.6;">${(ev.improvements || []).map(s => `<li>${esc(s)}</li>`).join("")}</ul>
            </td>
          </tr></table>` : "";

      return card(`
          <div style="margin-bottom:12px;"><span style="font-size:15px;font-weight:bold;color:#0522DE;">Question ${i + 1}:</span> <span style="font-size:15px;">${esc(a.question)}</span></div>
          ${lookFor}
          ${scoreRow}
          ${reRecordBanner}
          <div style="background:#f9fafb;border:1px solid #eee;padding:14px;margin-bottom:12px;">
            <div style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#9ca3af;margin-bottom:6px;">Transcript</div>
            <div style="font-size:14px;line-height:1.7;font-style:italic;">"${esc(a.transcript)}"</div>
          </div>
          ${feedback}`);
    }).join("");

    const sentOverall = sentimentIcon(overallSentiment);

    const distRows =
      bar("Excellent (8+)", scoreDistribution.excellent, "#16a34a") +
      bar("Good (5-7)", scoreDistribution.good, "#d97706") +
      bar("Needs work (&lt;5)", scoreDistribution.needsWork, "#dc2626");

    const sentimentChips = validScores.map((ev, i) => {
      const si = sentimentIcon(ev.sentiment);
      return `<span style="display:inline-block;font-size:12px;padding:4px 10px;background:#f3f4f6;margin:0 6px 6px 0;">Q${i + 1} ${si.emoji} ${esc(ev.sentiment)}</span>`;
    }).join("");

    const highlightsHTML = highlights.length > 0
      ? highlights.map(h => `<div style="font-size:13px;line-height:1.7;color:#6b7280;border-left:3px solid #0522DE;padding-left:10px;margin-bottom:8px;"><strong style="color:#111;">Q${h.q}:</strong> "${esc(h.text)}"</div>`).join("")
      : `<div style="font-size:13px;color:#9ca3af;">No highlights available.</div>`;

    const printButton = withPrintButton
      ? `<div style="text-align:center;margin-top:20px;"><button onclick="window.print()" style="padding:10px 24px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:14px;">Print / Save as PDF</button></div>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Evaluation Report — ${esc(role || "Software Engineer")} — ${now}</title>
</head>
<body style="margin:0;padding:24px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#191919;">
<table align="center" width="680" cellpadding="0" cellspacing="0" style="width:680px;">

  <!-- Header -->
  <tr><td style="border-bottom:3px solid #0522DE;padding-bottom:12px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="top"><span style="font-size:20px;font-weight:bold;color:#0522DE;">Interview Ready Program</span><div style="font-size:12px;color:#6b7280;">Evaluation Report</div>${candidateName ? `<div style="font-size:15px;font-weight:bold;color:#191919;margin-top:6px;">${esc(candidateName)}</div>` : ""}</td>
      <td align="right" valign="top"><span style="font-size:13px;color:#6b7280;">${now}</span>${role ? `<div style="font-size:13px;font-weight:bold;color:#0522DE;">${esc(role)}</div>` : ""}</td>
    </tr></table>
  </td></tr>
  <tr><td height="16" style="font-size:1px;line-height:16px;">&nbsp;</td></tr>

  ${card(`
    ${sectionTitle("Summary of Scores")}
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="110" valign="top">
        <table cellpadding="0" cellspacing="0"><tr>
          <td width="100" height="100" align="center" valign="middle" bgcolor="${gaugeColor(avgNum)}" style="background:${gaugeColor(avgNum)};color:#ffffff;font-size:34px;font-weight:bold;">${avg}<span style="font-size:16px;">/10</span></td>
        </tr></table>
      </td>
      <td valign="top" style="padding-left:20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;"><tr><td width="120" style="font-size:12px;color:#6b7280;">Questions</td><td style="font-size:12px;font-weight:bold;">${questions.length}</td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:5px 0;"><tr>
          <td width="120" style="font-size:12px;color:#6b7280;">Avg fluidity</td>
          <td>
            <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#e5e7eb" style="background:#e5e7eb;"><tr>
              <td width="${Math.round((avgFluidityNum || 0) * 10)}%" height="8" bgcolor="${gaugeColor(avgFluidityNum)}" style="background:${gaugeColor(avgFluidityNum)};font-size:1px;line-height:8px;">&nbsp;</td>
              <td height="8" style="font-size:1px;line-height:8px;">&nbsp;</td>
            </tr></table>
          </td>
          <td width="40" align="right" style="font-size:12px;font-weight:bold;">${avgFluidity}/10</td>
        </tr></table>
        ${distRows}
        ${totalReRecords > 0 ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;"><tr><td width="120" style="font-size:12px;color:#d97706;">Re-records</td><td style="font-size:12px;font-weight:bold;color:#d97706;">${totalReRecords}</td></tr></table>` : ""}
      </td>
    </tr></table>
  `)}

  ${card(`
    ${sectionTitle("Sentiment")}
    <div style="margin-bottom:12px;"><span style="font-size:28px;">${sentOverall.emoji}</span> <span style="font-size:18px;font-weight:bold;vertical-align:middle;">${esc(overallSentiment)}</span></div>
    <div>${sentimentChips}</div>
  `)}

  ${card(`
    ${sectionTitle("Highlights")}
    ${highlightsHTML}
  `)}

  ${card(`
    ${sectionTitle("Top Strengths", "#16a34a")}
    <ul style="margin:0;padding-left:18px;font-size:13px;color:#6b7280;line-height:1.7;">${topStrengths.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
  `)}

  ${card(`
    ${sectionTitle("Top Improvements", "#d97706")}
    <ul style="margin:0;padding-left:18px;font-size:13px;color:#6b7280;line-height:1.7;">${topImprovements.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
  `)}

  <tr><td style="font-size:16px;font-weight:bold;padding-bottom:12px;">Per Question Transcript and Feedback</td></tr>
  ${questionsHTML}

  <tr><td style="text-align:center;font-size:11px;color:#9ca3af;padding-top:8px;border-top:1px solid #e5e7eb;">Generated by Interview Ready Program — Unosquare</td></tr>
</table>
${printButton}
</body>
</html>`;

    return html;
  };

  // Rich, polished report for on-screen viewing and native print / Save-as-PDF.
  // Chrome renders this beautifully (gradients, rounded gauges, pill bars) and
  // print-color-adjust keeps the colors when saved as PDF.
  const buildReportHTML = (withPrintButton = false) => {
    const gaugeColor = (score) => {
      if (score >= 8) return "#16a34a";
      if (score >= 5) return "#d97706";
      return "#dc2626";
    };

    const questionsHTML = answers.map((a, i) => {
      const ev = evaluations[i];
      const sc = ev && !ev.error ? ev.score : 0;
      const sentInfo = ev ? sentimentIcon(ev.sentiment) : sentimentIcon("Neutral");
      const criteria = getCriteriaForQuestion(a.question);
      return `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:16px;page-break-inside:avoid;">
          <div style="margin-bottom:12px;">
            <span style="font-size:15px;font-weight:700;color:#0522DE;">Question ${i + 1}:</span>
            <span style="font-size:15px;font-weight:500;"> ${a.question}</span>
          </div>
          <div style="background:#e8efff;border:1px solid #2550f9;border-radius:8px;padding:12px 16px;margin-bottom:12px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#0522DE;margin-bottom:6px;">What a strong answer includes</div>
            <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#4b5563;">${criteria.greenFlags.map(f => `<li>${f}</li>`).join("")}</ul>
          </div>
          ${ev && !ev.error ? `
            <div style="display:flex;align-items:center;gap:16px;background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:12px;">
              <div style="width:64px;height:64px;border-radius:12px 12px 32px 32px;background:linear-gradient(180deg,${gaugeColor(sc)},${gaugeColor(sc)}dd);display:flex;align-items:baseline;justify-content:center;padding-top:18px;flex-shrink:0;">
                <span style="font-family:monospace;font-size:22px;font-weight:700;color:#fff;">${sc}</span>
                <span style="font-family:monospace;font-size:12px;color:rgba(255,255,255,0.7);">/10</span>
              </div>
              <div style="flex:1;">
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#6b7280;margin-bottom:6px;">
                  <span style="width:56px;font-weight:500;">Score</span>
                  <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
                    <div style="height:100%;width:${sc * 10}%;background:${gaugeColor(sc)};border-radius:4px;"></div>
                  </div>
                  <span style="font-family:monospace;font-size:13px;font-weight:600;color:#111;">${sc}/10</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#6b7280;">
                  <span style="width:56px;font-weight:500;">Fluidity</span>
                  <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
                    <div style="height:100%;width:${(ev.fluidity || 0) * 10}%;background:${gaugeColor(ev.fluidity || 0)};border-radius:4px;"></div>
                  </div>
                  <span style="font-family:monospace;font-size:13px;font-weight:600;color:#111;">${ev.fluidity ?? "—"}/10</span>
                </div>
              </div>
              <span style="font-size:13px;font-weight:700;padding:4px 12px;border-radius:12px;background:${sc >= 8 ? '#dcfce7;color:#16a34a' : sc >= 5 ? '#fef3c7;color:#d97706' : '#fee2e2;color:#dc2626'};">${ev.label}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
              <span style="font-size:18px;">${sentInfo.emoji}</span>
              <span style="font-size:13px;font-weight:600;color:#6b7280;">Sentiment: ${ev.sentiment}</span>
              ${ev.highlight ? `<span style="font-size:12px;color:#9ca3af;margin-left:8px;">— "${ev.highlight}"</span>` : ""}
            </div>
          ` : ""}
          ${a.reRecords > 0 ? `<div style="background:#fef3c7;border:1px solid #d97706;color:#d97706;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:500;margin-bottom:12px;">⚠ Re-recorded ${a.reRecords} time${a.reRecords !== 1 ? "s" : ""}</div>` : ""}
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:12px;">
            <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#9ca3af;display:block;margin-bottom:6px;">Transcript</span>
            <p style="font-size:14px;line-height:1.7;font-style:italic;margin:0;">"${a.transcript}"</p>
          </div>
          ${ev && !ev.error ? `
            <p style="font-size:14px;color:#6b7280;line-height:1.6;margin-bottom:12px;">${ev.summary}</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
              <div>
                <h4 style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#16a34a;margin:0 0 6px;">Strengths</h4>
                ${(ev.strengths || []).map(s => `<p style="font-size:13px;line-height:1.6;padding-left:12px;margin:0 0 6px;border-left:2px solid #16a34a;color:#6b7280;">${s}</p>`).join("")}
              </div>
              <div>
                <h4 style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#d97706;margin:0 0 6px;">Areas to improve</h4>
                ${(ev.improvements || []).map(s => `<p style="font-size:13px;line-height:1.6;padding-left:12px;margin:0 0 6px;border-left:2px solid #d97706;color:#6b7280;">${s}</p>`).join("")}
              </div>
            </div>
          ` : ""}
        </div>`;
    }).join("");

    const sentOverall = sentimentIcon(overallSentiment);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Evaluation Report — ${role || "Software Engineer"} — ${now}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f5f5f5; color: #191919; padding: 32px; }
    .container { max-width: 800px; margin: 0 auto; }
    @media print {
      body { background: #fff !important; padding: 16px !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
      .container { max-width: 100% !important; }
      .no-print { display: none !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
      div, span, p, h1, h2, h3, h4 { break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="container">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #0522DE;margin-bottom:24px;">
    <div>
      <h1 style="font-size:20px;font-weight:700;color:#0522DE;margin:0;">Interview Ready Program</h1>
      <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">Evaluation Report</p>
      ${candidateName ? `<p style="font-size:15px;font-weight:700;color:#191919;margin:6px 0 0;">${candidateName}</p>` : ""}
    </div>
    <div style="text-align:right;">
      <span style="font-size:13px;color:#6b7280;display:block;">${now}</span>
      ${role ? `<span style="font-size:13px;font-weight:600;color:#0522DE;background:#e8eaff;padding:2px 10px;border-radius:12px;">${role}</span>` : ""}
    </div>
  </div>

  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
    <h2 style="font-size:17px;font-weight:700;padding-bottom:8px;border-bottom:1px solid #e5e7eb;margin-bottom:16px;">Summary of Scores</h2>
    <div style="display:flex;gap:32px;align-items:center;">
      <div style="width:120px;height:120px;border-radius:16px 16px 50% 50%;background:linear-gradient(180deg,${gaugeColor(avgNum)},${gaugeColor(avgNum)}dd);display:flex;align-items:baseline;justify-content:center;padding-top:36px;flex-shrink:0;">
        <span style="font-family:monospace;font-size:36px;font-weight:700;color:#fff;">${avg}</span>
        <span style="font-family:monospace;font-size:18px;color:rgba(255,255,255,0.7);">/10</span>
      </div>
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <span style="font-size:13px;width:120px;color:#6b7280;">Questions</span>
          <span style="font-family:monospace;font-size:13px;font-weight:600;">${questions.length}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <span style="font-size:13px;width:120px;color:#6b7280;">Avg fluidity</span>
          <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${(avgFluidityNum / 10) * 100 || 0}%;background:${gaugeColor(avgFluidityNum)};border-radius:4px;"></div></div>
          <span style="font-family:monospace;font-size:13px;font-weight:600;min-width:36px;text-align:right;">${avgFluidity}/10</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <span style="font-size:13px;width:120px;color:#6b7280;">Excellent (8+)</span>
          <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${(scoreDistribution.excellent / questions.length) * 100}%;background:#16a34a;border-radius:4px;"></div></div>
          <span style="font-family:monospace;font-size:13px;font-weight:600;min-width:24px;text-align:right;">${scoreDistribution.excellent}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <span style="font-size:13px;width:120px;color:#6b7280;">Good (5-7)</span>
          <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${(scoreDistribution.good / questions.length) * 100}%;background:#d97706;border-radius:4px;"></div></div>
          <span style="font-family:monospace;font-size:13px;font-weight:600;min-width:24px;text-align:right;">${scoreDistribution.good}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <span style="font-size:13px;width:120px;color:#6b7280;">Needs work (&lt;5)</span>
          <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${(scoreDistribution.needsWork / questions.length) * 100}%;background:#dc2626;border-radius:4px;"></div></div>
          <span style="font-family:monospace;font-size:13px;font-weight:600;min-width:24px;text-align:right;">${scoreDistribution.needsWork}</span>
        </div>
        ${totalReRecords > 0 ? `<div style="display:flex;align-items:center;gap:12px;"><span style="font-size:13px;width:120px;color:#d97706;">Re-records</span><span style="font-family:monospace;font-size:13px;font-weight:600;color:#d97706;">${totalReRecords}</span></div>` : ""}
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
      <h2 style="font-size:17px;font-weight:700;padding-bottom:8px;border-bottom:1px solid #e5e7eb;margin-bottom:16px;">Sentiment</h2>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <span style="font-size:32px;">${sentOverall.emoji}</span>
        <span style="font-size:18px;font-weight:700;">${overallSentiment}</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${validScores.map((ev, i) => {
          const si = sentimentIcon(ev.sentiment);
          return `<span style="font-size:12px;padding:4px 10px;border-radius:12px;background:#f3f4f6;">Q${i + 1} ${si.emoji} ${ev.sentiment}</span>`;
        }).join("")}
      </div>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
      <h2 style="font-size:17px;font-weight:700;padding-bottom:8px;border-bottom:1px solid #e5e7eb;margin-bottom:16px;">Highlights</h2>
      ${highlights.length > 0 ? highlights.map(h => `<p style="font-size:13px;line-height:1.8;color:#6b7280;padding-left:12px;border-left:2px solid #0522DE;margin-bottom:8px;"><strong style="color:#111;">Q${h.q}:</strong> "${h.text}"</p>`).join("") : `<p style="font-size:13px;color:#9ca3af;">No highlights available.</p>`}
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
      <h2 style="font-size:17px;font-weight:700;padding-bottom:8px;border-bottom:1px solid #e5e7eb;margin-bottom:16px;color:#16a34a;">Top Strengths</h2>
      ${topStrengths.map(s => `<p style="font-size:13px;line-height:1.8;padding-left:12px;border-left:2px solid #16a34a;margin-bottom:8px;color:#6b7280;">${s}</p>`).join("")}
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
      <h2 style="font-size:17px;font-weight:700;padding-bottom:8px;border-bottom:1px solid #e5e7eb;margin-bottom:16px;color:#d97706;">Top Improvements</h2>
      ${topImprovements.map(s => `<p style="font-size:13px;line-height:1.8;padding-left:12px;border-left:2px solid #d97706;margin-bottom:8px;color:#6b7280;">${s}</p>`).join("")}
    </div>
  </div>

  <h2 style="font-size:17px;font-weight:700;padding-bottom:8px;border-bottom:1px solid #e5e7eb;margin-bottom:16px;">Per Question Transcript and Feedback</h2>
  ${questionsHTML}

  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">Generated by Interview Ready Program — Unosquare</p>

  ${withPrintButton ? `<div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()" style="padding:10px 24px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-size:14px;">Print / Save as PDF</button>
  </div>` : ""}
</div>
</body>
</html>`;
  };

  const handleOpenHTML = () => {
    const blob = new Blob([buildReportHTML(true)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const handleDownloadReport = () => {
    const name = (candidateName || role || "Candidate").replace(/\s+/g, "_");
    const blob = new Blob([buildReportHTML(true)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Interview_Report_${name}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Auto-send: POST the report HTML to the Power Automate flow, which converts
  // it to a PDF and emails it to the People Lead.
  const sendHtmlToFlow = async () => {
    if (!FLOW_URL || !plEmail) return false;
    setSendStatus("sending");
    try {
      // Content-Type text/plain + no-cors keeps this a "simple request" so the
      // browser skips the CORS preflight that Power Automate HTTP triggers reject.
      // The flow still reads the JSON body; we treat a resolved fetch as success.
      await fetch(FLOW_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          plEmail,
          candidateName: candidateName || "",
          role: role || "Software Engineer",
          date: now,
          average: avg,
          fluidity: avgFluidity,
          sentiment: overallSentiment,
          filename: `Interview_Report_${(candidateName || role || "Candidate").replace(/\s+/g, "_")}`,
          html: buildReportHtmlForPdf(),
        }),
      });
      setSendStatus("sent");
      return true;
    } catch (err) {
      console.error("Auto-send failed:", err);
      setSendStatus("error");
      return false;
    }
  };

  return (
    <div className="screen report-screen">
      {/* Report Header */}
      <div className="report-header">
        <div className="report-header-left">
          <img src="/psl-icon.svg" alt="Unosquare" className="report-logo" />
          <div>
            <h1 className="report-title">Interview Ready Program</h1>
            <p className="report-subtitle">Evaluation Report</p>
            {candidateName && <p className="report-candidate-name">{candidateName}</p>}
          </div>
        </div>
        <div className="report-header-right">
          <span className="report-date">{now}</span>
          {role && <span className="report-role">{role}</span>}
        </div>
      </div>

      {/* Evaluating state */}
      {!isDone && (
        <div className="report-loading-card">
          <div className="evaluating-msg">
            <span className="spinner" />
            {downloadProgress !== null
              ? `Downloading AI model... ${downloadProgress}%`
              : `Evaluating question ${evaluatingIdx + 1} of ${answers.length}...`}
          </div>
          <div className="eval-progress-track">
            <div
              className="eval-progress-fill"
              style={{ width: `${(evaluations.length / answers.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary of Scores */}
      {isDone && (
        <div className="report-summary-card">
          <h2 className="report-section-title">Summary of scores</h2>
          <div className="report-summary-body">
            <div className={`report-gauge report-gauge-${scoreColor(avgNum)}`}>
              <span className="report-gauge-score">{avg}</span>
              <span className="report-gauge-max">/10</span>
            </div>
            <div className="report-summary-bars">
              <div className="report-bar-row">
                <span className="report-bar-label">Questions</span>
                <span className="report-bar-value">{questions.length}</span>
              </div>
              <div className="report-bar-row">
                <span className="report-bar-label">Avg fluidity</span>
                <div className="report-bar-track">
                  <div className="report-bar-fill" style={{ width: `${(avgFluidityNum / 10) * 100 || 0}%`, background: barColor(avgFluidityNum) }} />
                </div>
                <span className="report-bar-value">{avgFluidity}/10</span>
              </div>
              <div className="report-bar-row">
                <span className="report-bar-label">Excellent (8+)</span>
                <div className="report-bar-track">
                  <div className="report-bar-fill" style={{ width: `${(scoreDistribution.excellent / questions.length) * 100}%`, background: "var(--color-success)" }} />
                </div>
                <span className="report-bar-value">{scoreDistribution.excellent}</span>
              </div>
              <div className="report-bar-row">
                <span className="report-bar-label">Good (5-7)</span>
                <div className="report-bar-track">
                  <div className="report-bar-fill" style={{ width: `${(scoreDistribution.good / questions.length) * 100}%`, background: "var(--color-warning)" }} />
                </div>
                <span className="report-bar-value">{scoreDistribution.good}</span>
              </div>
              <div className="report-bar-row">
                <span className="report-bar-label">Needs work (&lt;5)</span>
                <div className="report-bar-track">
                  <div className="report-bar-fill" style={{ width: `${(scoreDistribution.needsWork / questions.length) * 100}%`, background: "var(--color-danger)" }} />
                </div>
                <span className="report-bar-value">{scoreDistribution.needsWork}</span>
              </div>
              {totalReRecords > 0 && (
                <div className="report-bar-row">
                  <span className="report-bar-label report-bar-label-warn">Re-records</span>
                  <span className="report-bar-value report-bar-value-warn">{totalReRecords}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sentiment & Highlights */}
      {isDone && (
        <div className="report-insights-grid">
          <div className="report-insight-card">
            <h2 className="report-section-title">Sentiment</h2>
            <div className="report-sentiment-main">
              <span className="report-sentiment-emoji">{sentimentIcon(overallSentiment).emoji}</span>
              <span className="report-sentiment-label">{overallSentiment}</span>
            </div>
            <div className="report-sentiment-chips">
              {validScores.map((ev, i) => {
                const si = sentimentIcon(ev.sentiment);
                return (
                  <span key={i} className="report-sentiment-chip">
                    Q{i + 1} {si.emoji} {ev.sentiment}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="report-insight-card">
            <h2 className="report-section-title">Highlights</h2>
            {highlights.length > 0 ? highlights.map((h, i) => (
              <p key={i} className="report-highlight-item">
                <strong>Q{h.q}:</strong> "{h.text}"
              </p>
            )) : (
              <p className="text-muted">No highlights available.</p>
            )}
          </div>
        </div>
      )}

      {/* Top Strengths & Top Improvements */}
      {isDone && (
        <div className="report-insights-grid">
          <div className="report-insight-card">
            <h2 className="report-section-title text-success">Top Strengths</h2>
            {topStrengths.map((s, i) => (
              <p key={i} className="report-q-point report-q-point-success">{s}</p>
            ))}
          </div>
          <div className="report-insight-card">
            <h2 className="report-section-title text-warning">Top Improvements</h2>
            {topImprovements.map((s, i) => (
              <p key={i} className="report-q-point report-q-point-warning">{s}</p>
            ))}
          </div>
        </div>
      )}

      {/* Per question transcript and feedback */}
      <h2 className="report-section-title" style={{ marginTop: 24 }}>
        Per question transcript and feedback
      </h2>

      {answers.map((a, i) => {
        const ev = evaluations[i];
        const isEvaluating = !isDone && i >= evaluations.length;
        const criteria = getCriteriaForQuestion(a.question);

        return (
          <div key={i} className={`report-question-card ${isEvaluating ? "report-card-pending" : ""}`}>
            <div className="report-q-header">
              <span className="report-q-number">Question {i + 1}:</span>
              <span className="report-q-text">{a.question}</span>
            </div>

            <div className="report-q-lookfor">
              <span className="report-q-lookfor-title">What a strong answer includes</span>
              <ul>
                {criteria.greenFlags.map((f, j) => (
                  <li key={j}>{f}</li>
                ))}
              </ul>
            </div>

            {ev && !ev.error && (
              <div className="report-q-scores">
                <div className={`report-q-gauge report-gauge-${scoreColor(ev.score)}`}>
                  <span className="report-q-gauge-score">{ev.score}</span>
                  <span className="report-q-gauge-max">/10</span>
                </div>
                <div className="report-q-bars">
                  <div className="report-q-bar-item">
                    <span>Score</span>
                    <div className="report-bar-track">
                      <div className="report-bar-fill" style={{ width: barWidth(ev.score), background: barColor(ev.score) }} />
                    </div>
                    <span className="report-bar-value">{ev.score}/10</span>
                  </div>
                  <div className="report-q-bar-item">
                    <span>Fluidity</span>
                    <div className="report-bar-track">
                      <div className="report-bar-fill" style={{ width: barWidth(ev.fluidity || 0), background: barColor(ev.fluidity || 0) }} />
                    </div>
                    <span className="report-bar-value">{ev.fluidity ?? "—"}/10</span>
                  </div>
                </div>
                <span className={`report-q-label report-q-label-${scoreColor(ev.score)}`}>{ev.label}</span>
              </div>
            )}

            {ev && !ev.error && (
              <div className="report-q-sentiment-row">
                <span className="report-sentiment-chip">
                  {sentimentIcon(ev.sentiment).emoji} {ev.sentiment}
                </span>
                {ev.highlight && (
                  <span className="report-q-highlight">"{ev.highlight}"</span>
                )}
              </div>
            )}

            {isEvaluating && (
              <div className="evaluating-msg" style={{ padding: "12px 0" }}>
                <span className="spinner" /> Evaluating...
              </div>
            )}

            {a.reRecords > 0 && (
              <div className="report-warning-banner">
                ⚠ Candidate re-recorded this answer {a.reRecords} time{a.reRecords !== 1 ? "s" : ""}
              </div>
            )}

            <div className="report-transcript-box">
              <span className="report-transcript-label">Transcript</span>
              <p className="report-transcript-text">"{a.transcript}"</p>
            </div>

            {ev && !ev.error && (
              <>
                <p className="report-q-summary">{ev.summary}</p>
                <div className="report-q-feedback">
                  <div className="report-q-col">
                    <h4 className="report-q-col-title text-success">Strengths</h4>
                    {ev.strengths?.map((s, j) => (
                      <p key={j} className="report-q-point report-q-point-success">{s}</p>
                    ))}
                  </div>
                  <div className="report-q-col">
                    <h4 className="report-q-col-title text-warning">Areas to improve</h4>
                    {ev.improvements?.map((s, j) => (
                      <p key={j} className="report-q-point report-q-point-warning">{s}</p>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Actions */}
      {isDone && isCandidate && (
        <div className="report-candidate-actions">
          {/* Automatic delivery configured */}
          {FLOW_URL && plEmail ? (
            <>
              {sendStatus === "sending" && (
                <div className="report-sent-banner report-sent-banner-info">
                  <span className="spinner" />
                  <div>
                    <strong>Sending your report…</strong>
                    <p>Generating the PDF and delivering it to your People Lead. Please wait.</p>
                  </div>
                </div>
              )}
              {sendStatus === "sent" && (
                <div className="report-sent-banner">
                  <span className="report-sent-icon">✓</span>
                  <div>
                    <strong>Results sent to your People Lead</strong>
                    <p>Your report has been delivered automatically. You can also download a copy for your own records.</p>
                    <div className="report-actions no-print" style={{ marginTop: 12 }}>
                      <button className="btn btn-primary" onClick={handleDownloadReport}>Download report</button>
                    </div>
                  </div>
                </div>
              )}
              {sendStatus === "error" && (
                <div className="report-sent-banner report-sent-banner-error">
                  <span className="report-sent-icon report-sent-icon-error">!</span>
                  <div>
                    <strong>Automatic send didn't go through</strong>
                    <p>Please send your report manually: open it, save as PDF, then email it to your People Lead.</p>
                    <div className="report-actions no-print" style={{ marginTop: 12 }}>
                      <button className="btn btn-primary" onClick={handleDownloadReport}>Download report</button>
                      <button className="btn" onClick={handleOpenHTML}>Open &amp; Save as PDF</button>
                      <button className="btn btn-secondary" onClick={handleSendToPL}>Email to People Lead</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Manual fallback (no flow configured) */
            <>
              <div className="report-sent-banner">
                <span className="report-sent-icon">✓</span>
                <div>
                  <strong>Your interview is complete!</strong>
                  <p>Download a copy for yourself, then send your results to your People Lead:</p>
                  <ol className="report-steps">
                    <li><strong>Download report</strong> saves the report to your device. (Or use "Open &amp; Save as PDF" to save it as a PDF.)</li>
                    <li><strong>Email to People Lead</strong> opens an email. Attach the report you just saved.</li>
                  </ol>
                </div>
              </div>
              <div className="report-actions no-print">
                <button className="btn btn-primary" onClick={handleDownloadReport}>
                  Download report
                </button>
                <button className="btn" onClick={handleOpenHTML}>
                  Open &amp; Save as PDF
                </button>
                {plEmail && (
                  <button className="btn btn-secondary" onClick={handleSendToPL}>
                    Email to People Lead
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {isDone && !isCandidate && (
        <div className="report-actions no-print">
          <button className="btn" onClick={handleCopyReport}>
            {copied ? "Copied!" : "Copy report"}
          </button>
          <button className="btn btn-secondary" onClick={handleEmailReport}>
            Email report
          </button>
          <button className="btn" onClick={handleOpenHTML}>
            View as HTML
          </button>
          <button className="btn" onClick={handlePrint}>
            Print / PDF
          </button>
          <button className="btn" onClick={onRetry}>↻ Retry</button>
          <button className="btn btn-primary" onClick={onNewInterview}>New interview</button>
        </div>
      )}

      <p className="report-footer">Generated by Interview Ready Program — Unosquare</p>
    </div>
  );
}
