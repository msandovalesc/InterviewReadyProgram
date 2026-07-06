import { RESPONSE_SCHEMA } from "../constants";
import { getCriteriaForQuestion } from "./evaluationCriteria";

export async function evaluateAnswer({ question, transcript, role, onDownloadProgress }) {
  const criteria = getCriteriaForQuestion(question);

  const greenFlags = criteria.greenFlags.map(f => `  - ${f}`).join("\n");
  const redFlags = criteria.redFlags.map(f => `  - ${f}`).join("\n");

  const session = await LanguageModel.create({
    systemPrompt: `You are an expert interviewer evaluating a candidate's verbal response for Unosquare.
Role being interviewed for: ${role || "Software Engineer"}.

EVALUATION CRITERIA:

Green Flags (reward these in scoring):
${greenFlags}

Red Flags (penalize these in scoring):
${redFlags}

Emotional Tone to Listen For: ${criteria.emotionalTone}

SCORING RULES:
- Score 1-10 based on how many green flags are present and how few red flags appear.
- 9-10 "Excellent": Multiple green flags, no red flags, strong emotional tone.
- 7-8 "Good": Several green flags, minor gaps, appropriate tone.
- 5-6 "Acceptable": Some green flags but also some red flags or vague answers.
- 1-4 "Needs work": Mostly red flags, vague, blaming, no reflection.

TONE (VERY IMPORTANT — the candidate will read this feedback directly):
- Write in a warm, professional, and constructive tone, as a supportive coach would.
- Address the candidate respectfully in the second person ("you", "your answer") — never in the third person ("the candidate").
- Never use blunt, judgmental, or dismissive words such as "awkward", "poor", "weak", "bad", "failed", "rambling", or "unclear". Instead, frame gaps as growth opportunities (e.g. "consider structuring your answer with...", "you could strengthen this by...").
- Lead with what worked, then frame improvements as specific, encouraging next steps.
- Be honest and specific, but always kind and actionable.

OUTPUT:
- score: number 1-10
- fluidity: number 1-10 — how fluid and articulate the spoken answer was: pacing, coherence, sentence structure, and absence of excessive filler words or rambling. 10 = smooth, well-structured, confident delivery; 1 = disjointed, heavy filler, hard to follow.
- label: "Needs work" | "Acceptable" | "Good" | "Excellent"
- sentiment: "Positive" | "Neutral" | "Negative" | "Mixed" — the candidate's emotional tone and attitude detected in their answer
- highlight: one genuinely positive, encouraging standout moment from the answer (10 words max)
- summary: exactly 2 sentences, written directly to the candidate in a supportive, professional tone
- strengths: exactly 2 specific things you did well, phrased encouragingly ("you clearly...", "you did a great job of...")
- improvements: exactly 2 constructive, actionable next steps, phrased as encouraging suggestions ("consider...", "next time you could...", "you can strengthen this by...")`,
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        if (onDownloadProgress) {
          onDownloadProgress(Math.floor(e.loaded * 100));
        }
      });
    },
  });

  const result = await session.prompt(
    `Question: "${question}"\n\nCandidate answer: "${transcript}"`,
    { responseConstraint: RESPONSE_SCHEMA }
  );

  session.destroy();
  return JSON.parse(result);
}
