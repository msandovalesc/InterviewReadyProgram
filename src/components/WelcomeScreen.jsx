export default function WelcomeScreen({ questionCount, role, candidateName, onStart }) {
  return (
    <div className="screen welcome-screen">
      <div className="title-row">
        <img src="/psl-icon.svg" alt="People Success Lead" className="title-icon" />
        <h1>Interview Ready Program</h1>
      </div>

      {role && <p className="welcome-role">{role}</p>}

      <p className="welcome-intro">
        {candidateName ? `Welcome, ${candidateName}! ` : "Welcome! "}
        You're about to begin your mock interview. Take a moment to read how it works,
        and click <strong>Start interview</strong> when you're ready.
      </p>

      <div className="welcome-card">
        <h2 className="welcome-card-title">What to expect</h2>
        <ul className="welcome-list">
          <li><strong>{questionCount} question{questionCount !== 1 ? "s" : ""}</strong>, asked one at a time.</li>
          <li>Each question is <strong>read aloud</strong>, then a short countdown begins.</li>
          <li>You answer <strong>by speaking</strong> — your microphone records your response.</li>
          <li>You have <strong>up to 90 seconds</strong> per question.</li>
          <li>Answer naturally, as you would in a real interview — there are <strong>no retries</strong>.</li>
          <li>When you finish, your results are sent to your People Lead automatically.</li>
        </ul>
      </div>

      <div className="welcome-tips">
        <p>🎤 Make sure your microphone is connected and you're in a quiet place.</p>
        <p>🔒 Your browser may ask for microphone permission — please allow it.</p>
      </div>

      <button className="btn btn-primary btn-start" onClick={onStart}>
        Start interview →
      </button>
    </div>
  );
}
