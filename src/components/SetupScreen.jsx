import { useState, useEffect } from "react";

const SENIORITY_LEVELS = ["Junior", "Mid", "Senior"];
const EMAIL_DOMAIN = "@unosquare.com";

export default function SetupScreen() {
  const [candidateName, setCandidateName] = useState("");
  const [seniority, setSeniority] = useState("");
  const [skill, setSkill] = useState("");
  const [plEmailLocal, setPlEmailLocal] = useState("");
  const [totalMinutes, setTotalMinutes] = useState(30);
  const [questionCount, setQuestionCount] = useState(5);
  const [selectionMode, setSelectionMode] = useState("default"); // "default" | "manual"
  const [manualPicked, setManualPicked] = useState([]); // bank questions chosen
  const [customQuestions, setCustomQuestions] = useState([]);
  const [customInput, setCustomInput] = useState("");
  const [bank, setBank] = useState({});
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/questionBank.json")
      .then((res) => res.json())
      .then(setBank)
      .catch(() => {});
  }, []);

  const skills = Object.keys(bank);
  const available = (bank[skill] && bank[skill][seniority]) || [];
  const maxQuestions = available.length;

  const reset = () => setGeneratedLink("");

  // In manual mode: chosen bank questions (in bank order) + custom questions.
  // In default mode: first N from the bank.
  const manualQuestions = [
    ...available.filter((q) => manualPicked.includes(q)),
    ...customQuestions,
  ];
  const effectiveCount = Math.min(questionCount, maxQuestions || questionCount);
  const defaultQuestions = available.slice(0, effectiveCount);
  const questions = selectionMode === "manual" ? manualQuestions : defaultQuestions;

  const role = skill && seniority ? `${seniority} ${skill}` : "";
  const activeCount = questions.length;
  const perAnswerSec = activeCount > 0 ? Math.round((totalMinutes * 60) / activeCount) : 0;
  const perAnswerMin = (perAnswerSec / 60).toFixed(1);

  const plEmail = plEmailLocal.trim()
    ? plEmailLocal.includes("@")
      ? plEmailLocal.trim()
      : `${plEmailLocal.trim()}${EMAIL_DOMAIN}`
    : "";

  const canComplete =
    candidateName.trim() && skill && seniority && questions.length > 0 && plEmailLocal.trim();

  const changeSkillOrSeniority = (setter, value) => {
    setter(value);
    setManualPicked([]);
    setCustomQuestions([]);
    reset();
  };

  const togglePick = (q) => {
    reset();
    setManualPicked((prev) =>
      prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]
    );
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    setCustomQuestions((prev) => [...prev, trimmed]);
    setCustomInput("");
    reset();
  };

  const removeCustom = (q) => {
    setCustomQuestions((prev) => prev.filter((x) => x !== q));
    reset();
  };

  const handleComplete = () => {
    const config = {
      questions,
      role: role || undefined,
      plEmail: plEmail || undefined,
      candidateName: candidateName.trim() || undefined,
      timeLimit: perAnswerSec || undefined,
    };
    const encoded = encodeURIComponent(btoa(JSON.stringify(config)));
    const link = `${window.location.origin}${window.location.pathname}#/interview?config=${encoded}`;
    setGeneratedLink(link);
    setCopied(false);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stepQuestions = (delta) => {
    reset();
    setQuestionCount((prev) => {
      const upper = maxQuestions || 20;
      return Math.max(1, Math.min(upper, prev + delta));
    });
  };

  const stepTime = (delta) => {
    reset();
    setTotalMinutes((prev) => Math.max(5, Math.min(180, prev + delta)));
  };

  const skillSelected = skill && seniority;

  return (
    <div className="screen setup-screen">
      <div className="title-row">
        <img src="/psl-icon.svg" alt="People Success Lead" className="title-icon" />
        <h1>Interview Ready Program</h1>
      </div>
      <p className="text-muted" style={{ textAlign: "center" }}>
        Configure the interview, then share the generated link with your candidate.
      </p>

      {/* Candidate details */}
      <h2 className="setup-section-title">Candidate details</h2>

      <div className="field">
        <label>Candidate name</label>
        <input
          type="text"
          value={candidateName}
          onChange={(e) => { setCandidateName(e.target.value); reset(); }}
          placeholder="e.g. Maya Rodriguez"
          className="setup-input"
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label>Seniority</label>
          <select
            className="setup-select"
            value={seniority}
            onChange={(e) => changeSkillOrSeniority(setSeniority, e.target.value)}
          >
            <option value="">Select…</option>
            {SENIORITY_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Main skill</label>
          <select
            className="setup-select"
            value={skill}
            onChange={(e) => changeSkillOrSeniority(setSkill, e.target.value)}
          >
            <option value="">Select…</option>
            {skills.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>People Success Lead email</label>
        <div className="email-suffix-row">
          <input
            type="text"
            value={plEmailLocal}
            onChange={(e) => { setPlEmailLocal(e.target.value); reset(); }}
            placeholder="mariana.sandoval"
            className="setup-input"
          />
          {!plEmailLocal.includes("@") && <span className="email-suffix">{EMAIL_DOMAIN}</span>}
        </div>
        {plEmail && (
          <span className="setup-hint text-success">
            Results report will be sent to {plEmail}
          </span>
        )}
      </div>

      {/* Interview setup */}
      <h2 className="setup-section-title">Interview setup</h2>

      <div className="field-row">
        <div className="field">
          <label>Total time</label>
          <div className="stepper">
            <button className="stepper-btn" onClick={() => stepTime(-5)}>−</button>
            <span className="stepper-value">{totalMinutes} min</span>
            <button className="stepper-btn" onClick={() => stepTime(5)}>+</button>
          </div>
        </div>
        <div className="field">
          <label>Questions</label>
          {selectionMode === "default" ? (
            <div className="stepper">
              <button className="stepper-btn" onClick={() => stepQuestions(-1)}>−</button>
              <span className="stepper-value">{effectiveCount || questionCount}</span>
              <button className="stepper-btn" onClick={() => stepQuestions(1)}>+</button>
            </div>
          ) : (
            <div className="stepper-static">{questions.length} selected</div>
          )}
        </div>
      </div>

      {activeCount > 0 && (
        <div className="pace-hint">
          ≈ <strong>{perAnswerMin} min per answer.</strong>{" "}
          {perAnswerSec >= 60
            ? "Comfortable pace for behavioral answers."
            : "Brisk pace — good for quick, focused answers."}
        </div>
      )}

      {/* Question selection */}
      <h2 className="setup-section-title">Question selection</h2>

      {!skillSelected && (
        <p className="text-muted" style={{ fontSize: 13 }}>
          Select a seniority and main skill first to load the question bank.
        </p>
      )}

      {skillSelected && (
        <>
          <div className="selection-modes">
            <label className={`selection-mode ${selectionMode === "default" ? "active" : ""}`}>
              <input
                type="radio"
                name="selMode"
                checked={selectionMode === "default"}
                onChange={() => { setSelectionMode("default"); reset(); }}
              />
              <div>
                <strong>Default</strong>
                <span>The system draws the first questions from the bank automatically.</span>
              </div>
            </label>
            <label className={`selection-mode ${selectionMode === "manual" ? "active" : ""}`}>
              <input
                type="radio"
                name="selMode"
                checked={selectionMode === "manual"}
                onChange={() => { setSelectionMode("manual"); reset(); }}
              />
              <div>
                <strong>Select manually</strong>
                <span>Pick each question from the bank and add your own.</span>
              </div>
            </label>
          </div>

          {selectionMode === "manual" && (
            <div className="manual-bank">
              <span className="drawn-questions-title">Question bank — {role}</span>
              {available.map((q, i) => {
                const picked = manualPicked.includes(q);
                return (
                  <div
                    key={i}
                    className={`bank-option ${picked ? "picked" : ""}`}
                    onClick={() => togglePick(q)}
                  >
                    <span className="bank-check">{picked ? "✓" : ""}</span>
                    <span>{q}</span>
                  </div>
                );
              })}

              <div className="custom-add">
                <textarea
                  rows={2}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Add your own question…"
                  className="setup-input"
                />
                <button className="btn" onClick={addCustom} disabled={!customInput.trim()}>
                  Add
                </button>
              </div>

              {customQuestions.length > 0 && (
                <div className="custom-list">
                  {customQuestions.map((q, i) => (
                    <div key={i} className="bank-option picked">
                      <span className="bank-check">✓</span>
                      <span style={{ flex: 1 }}>{q}</span>
                      <button className="btn-icon" onClick={() => removeCustom(q)} title="Remove">🗑</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Preview */}
      {questions.length > 0 && (
        <div className="drawn-questions">
          <span className="drawn-questions-title">Questions to be asked</span>
          {questions.map((q, i) => (
            <div key={i} className="drawn-question-item">
              <span className="drawn-question-index">{i + 1}.</span>
              <span>{q}</span>
            </div>
          ))}
        </div>
      )}

      <button
        className={`btn btn-complete ${generatedLink ? "btn-completed" : "btn-primary"}`}
        disabled={!canComplete || !!generatedLink}
        onClick={handleComplete}
      >
        {generatedLink ? (
          <><span className="btn-completed-check">✓</span> Completed</>
        ) : (
          "Complete setup"
        )}
      </button>

      {generatedLink && (
        <div className="link-box">
          <label>Share this link with the candidate:</label>
          <div className="link-row">
            <input type="text" value={generatedLink} readOnly onClick={(e) => e.target.select()} />
            <button className="btn" onClick={handleCopyLink}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
