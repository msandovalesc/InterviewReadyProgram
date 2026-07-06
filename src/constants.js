export const TIME_LIMIT = 90;

// Power Automate "When an HTTP request is received" trigger URL.
// Paste the URL from your flow here to enable automatic PDF delivery to the People Lead.
// Leave empty ("") to fall back to the manual Save-as-PDF + email flow.
export const FLOW_URL = "";

export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    score:        { type: "number" },
    fluidity:     { type: "number" },
    label:        { type: "string", enum: ["Needs work", "Acceptable", "Good", "Excellent"] },
    sentiment:    { type: "string", enum: ["Positive", "Neutral", "Negative", "Mixed"] },
    highlight:    { type: "string" },
    strengths:    { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 },
    improvements: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 },
    summary:      { type: "string" }
  },
  required: ["score", "fluidity", "label", "sentiment", "highlight", "strengths", "improvements", "summary"]
};

export const SCORE_THRESHOLDS = {
  excellent: 8,
  acceptable: 5,
};
