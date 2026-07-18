export const TIME_LIMIT = 90;

// Base path for the Netlify Functions backend. On Netlify these are served at
// /api/* (see netlify.toml + each function's config.path).
export const API_BASE = "/api";

// Power Automate "When an HTTP request is received" trigger URL.
// Paste the URL from your flow here to enable automatic PDF delivery to the People Lead.
// Leave empty ("") to fall back to the manual Save-as-PDF + email flow.
export const FLOW_URL = "https://defaulteedd1340df1a4db28a03b4cfb1fa3e.9d.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/05/workflows/f69cad9a63d94c57ba0d39d1b961bf08/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=3oL_i36didjteBGCsqUQnIrnSQ5QQCXqVhpnLbVDFvI";

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
