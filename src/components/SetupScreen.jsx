import { useState, useEffect } from "react";

const SENIORITY_LEVELS = ["Junior", "Mid", "Senior"];

export default function SetupScreen({ onStart }) {
  const [role, setRole] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [questions, setQuestions] = useState([]);
  const [input, setInput] = useState("");
  const [bank, setBank] = useState({});
  const [selectedTrack, setSelectedTrack] = useState("");
  const [selectedSeniority, setSelectedSeniority] = useState("");
  const [plEmail, setPlEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/questionBank.json")
      .then((res) => res.json())
      .then(setBank)
      .catch(() => {});
  }, []);

  const tracks = Object.keys(bank);

  const loadQuestions = (track, seniority) => {
    if (bank[track] && bank[track][seniority]) {
      setQuestions(bank[track][seniority]);
      setRole(`${seniority} ${track}`);
      setGeneratedLink("");
    }
  };

  const handleSelectTrack = (track) => {
    setSelectedTrack(track);
    setGeneratedLink("");
    if (selectedSeniority) {
      loadQuestions(track, selectedSeniority);
    }
  };

  const handleSelectSeniority = (level) => {
    setSelectedSeniority(level);
    setGeneratedLink("");
    if (selectedTrack) {
      loadQuestions(selectedTrack, level);
    }
  };

  const addQuestion = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setQuestions((prev) => [...prev, trimmed]);
    setInput("");
    setGeneratedLink("");
  };

  const removeQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setGeneratedLink("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addQuestion();
    }
  };

  const handleGenerateLink = () => {
    const config = { questions, role: role || undefined, plEmail: plEmail.trim() || undefined, candidateName: candidateName.trim() || undefined };
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

  return (
    <div className="screen setup-screen">
      <div className="title-row">
        <img src="/psl-icon.svg" alt="People Success Lead" className="title-icon" />
        <h1>Interview Ready Program</h1>
      </div>
      <p className="text-muted" style={{ textAlign: "center" }}>
        Select the technology and seniority level to load questions,
        or add your own.
      </p>

      <div className="field">
        <label>Candidate name</label>
        <input
          type="text"
          value={candidateName}
          onChange={(e) => { setCandidateName(e.target.value); setGeneratedLink(""); }}
          placeholder="e.g. Jane Doe"
          className="pl-email-input"
        />
      </div>

      {tracks.length > 0 && (
        <div className="field">
          <label>Technology</label>
          <div className="track-chips">
            {tracks.map((track) => (
              <button
                key={track}
                className={`btn btn-chip ${selectedTrack === track ? "btn-chip-active" : ""}`}
                onClick={() => handleSelectTrack(track)}
              >
                {track}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <label>Seniority</label>
        <div className="track-chips">
          {SENIORITY_LEVELS.map((level) => (
            <button
              key={level}
              className={`btn btn-chip ${selectedSeniority === level ? "btn-chip-active" : ""}`}
              onClick={() => handleSelectSeniority(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Interview questions</label>
        <div className="input-row">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a question and press Enter or click Add..."
          />
          <button className="btn" onClick={addQuestion} disabled={!input.trim()}>
            Add
          </button>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="question-list">
          {questions.map((q, i) => (
            <div key={i} className="question-item">
              <span className="question-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="question-text">{q}</span>
              <button
                className="btn-icon"
                onClick={() => removeQuestion(i)}
                title="Remove question"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="field">
        <label>Your email (People Lead)</label>
        <input
          type="email"
          value={plEmail}
          onChange={(e) => { setPlEmail(e.target.value); setGeneratedLink(""); }}
          placeholder="your.name@unosquare.com"
          className="pl-email-input"
        />
        <span className="text-muted" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
          Candidate results will be emailed to this address automatically.
        </span>
      </div>

      <div className="setup-actions">
        <button
          className="btn btn-secondary"
          disabled={questions.length === 0 || !plEmail.trim().includes("@")}
          onClick={handleGenerateLink}
        >
          Generate candidate link
        </button>
        <button
          className="btn btn-primary"
          disabled={questions.length === 0}
          onClick={() => onStart(questions, role, candidateName.trim())}
        >
          Start interview here →
        </button>
      </div>

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
