import { scoreColor } from "../utils/scoreColor";

export default function ScoreCard({ question, score, transcript, reRecords, isEvaluating }) {
  const eval_ = score.evaluation;

  return (
    <div className={`score-card ${isEvaluating ? "score-card-pending" : ""}`}>
      <div className="score-card-header">
        <p className="score-card-question">{question}</p>
        {eval_ && !eval_.error && (
          <div className="score-card-badge-group">
            <span className={`score-badge score-${scoreColor(eval_.score)}`}>
              {eval_.score}/10
            </span>
            <span className="eval-label">{eval_.label}</span>
          </div>
        )}
        {isEvaluating && (
          <span className="score-card-pending-label">Pending</span>
        )}
      </div>

      {reRecords > 0 && (
        <span className="re-record-badge">Re-recorded {reRecords} time{reRecords !== 1 ? "s" : ""}</span>
      )}

      {transcript && (
        <p className="score-card-transcript">"{transcript}"</p>
      )}

      {eval_ && !eval_.error && (
        <>
          <p className="text-muted score-card-summary">{eval_.summary}</p>
          <div className="score-card-details">
            <div className="score-card-col">
              {eval_.strengths?.map((s, i) => (
                <p key={i} className="eval-point eval-point-success">{s}</p>
              ))}
            </div>
            <div className="score-card-col">
              {eval_.improvements?.map((s, i) => (
                <p key={i} className="eval-point eval-point-warning">{s}</p>
              ))}
            </div>
          </div>
        </>
      )}

      {eval_ && eval_.error && (
        <p className="text-muted">{eval_.summary}</p>
      )}
    </div>
  );
}
