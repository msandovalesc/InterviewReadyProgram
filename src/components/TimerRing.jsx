import { TIME_LIMIT } from "../constants";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function TimerRing({ timeLeft }) {
  const offset = CIRCUMFERENCE * (1 - timeLeft / TIME_LIMIT);
  let colorClass = "success";
  if (timeLeft <= 5) colorClass = "danger";
  else if (timeLeft <= 15) colorClass = "warning";

  return (
    <div className={`timer-ring ${colorClass}`}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle
          cx="26"
          cy="26"
          r={RADIUS}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="3"
        />
        <circle
          cx="26"
          cy="26"
          r={RADIUS}
          fill="none"
          className="timer-ring-arc"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 26 26)"
        />
      </svg>
      <span className={`timer-ring-text ${timeLeft <= 5 ? "pulse" : ""}`}>
        {timeLeft}s
      </span>
    </div>
  );
}
