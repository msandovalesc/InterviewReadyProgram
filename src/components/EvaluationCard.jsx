import { scoreColor } from "../utils/scoreColor";

export default function EvaluationCard({ evaluation }) {
  if (evaluation.error) {
    return (
      <div className="eval-card eval-error">
        <p>{evaluation.summary}</p>
      </div>
    );
  }

  const color = scoreColor(evaluation.score);

  return (
    <div className={`eval-card eval-${color}`}>
      <div className="eval-header">
        <span className={`score-badge score-${color}`}>
          {evaluation.score}/10
        </span>
        <span className="eval-label">{evaluation.label}</span>
      </div>
      <p className="eval-summary">{evaluation.summary}</p>
      <div className="eval-grid">
        <div className="eval-col">
          <h4 className="eval-col-title text-success">Strengths</h4>
          {evaluation.strengths?.map((s, i) => (
            <p key={i} className="eval-point eval-point-success">
              {s}
            </p>
          ))}
        </div>
        <div className="eval-col">
          <h4 className="eval-col-title text-warning">To improve</h4>
          {evaluation.improvements?.map((s, i) => (
            <p key={i} className="eval-point eval-point-warning">
              {s}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
