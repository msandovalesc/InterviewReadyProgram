import { SCORE_THRESHOLDS } from "../constants";

export function scoreColor(score) {
  if (score >= SCORE_THRESHOLDS.excellent) return "success";
  if (score >= SCORE_THRESHOLDS.acceptable) return "warning";
  return "danger";
}
