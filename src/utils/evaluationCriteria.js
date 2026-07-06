const SECTION_CRITERIA = {
  "Warm-up & Career Story": {
    greenFlags: [
      "Shows genuine passion for engineering",
      "Demonstrates self-awareness",
      "Communicates clearly and concisely",
      "Takes ownership of career path",
      "Highlights meaningful impact over role titles"
    ],
    redFlags: [
      "Recites resume without reflection",
      "Can't articulate what excites them",
      "Blames previous employers for career gaps",
      "No sense of personal growth or direction",
      "Avoids saying what they want to avoid"
    ],
    emotionalTone: "Enthusiasm, clarity, nostalgia for key moments, forward-looking energy"
  },
  "Recent Project Deep Dive": {
    greenFlags: [
      "Uses 'I' not only 'we' — shows personal ownership",
      "Explains the problem, not just the solution",
      "Shows product thinking (user impact)",
      "Pride in craftsmanship and quality",
      "Can quantify or describe impact"
    ],
    redFlags: [
      "Always says 'we did…' with no personal contribution",
      "Can't explain why the project mattered",
      "No product/user thinking — only technical details",
      "Describes tasks, not outcomes",
      "Struggles to name what they personally built"
    ],
    emotionalTone: "Pride, engagement, detail-orientation, excitement about impact"
  },
  "Challenges & Problem Solving": {
    greenFlags: [
      "Takes accountability without drama",
      "No finger-pointing at teammates",
      "Shows collaboration during crisis",
      "Demonstrates a learning mindset",
      "Can articulate a concrete lesson learned"
    ],
    redFlags: [
      "Blames teammates, product, or leadership",
      "Claims no challenges ever occurred",
      "No learning or behavior change after",
      "Dismissive of the disagreement's importance",
      "Became resentful when overruled"
    ],
    emotionalTone: "Candor, accountability, calm reflection, growth orientation"
  },
  "Collaboration & Team Dynamics": {
    greenFlags: [
      "Communicates feedback respectfully",
      "Strong quality mindset",
      "Able to give and receive feedback constructively",
      "Identifies their team role with self-awareness",
      "Values psychological safety"
    ],
    redFlags: [
      "Would say nothing to avoid conflict",
      "Goes straight to manager instead of peer",
      "Describes only technical strengths, no soft skills",
      "Can't articulate what made a team great",
      "Dismissive of others' work styles"
    ],
    emotionalTone: "Warmth, teamwork pride, comfort with directness, humility"
  },
  "Ownership & Accountability": {
    greenFlags: [
      "'I helped fix it' mentality",
      "Takes incident ownership even partially",
      "Thinks in root cause analysis",
      "Drives continuous improvement",
      "Communicates impact to stakeholders clearly"
    ],
    redFlags: [
      "'It wasn't my fault'",
      "'QA missed it' or 'The dev broke it'",
      "No post-mortem or follow-through",
      "Minimizes customer impact",
      "No preventive action taken"
    ],
    emotionalTone: "Seriousness, responsibility, measured calm, solution focus"
  },
  "Working With Ambiguity": {
    greenFlags: [
      "Proactively asks clarifying questions",
      "Documents assumptions before moving",
      "Involves PM/product/stakeholders early",
      "Doesn't wait for perfect information",
      "De-risks assumptions with early validation"
    ],
    redFlags: [
      "Just started building without clarification",
      "Waited until blocked to escalate",
      "Never documented assumptions",
      "Didn't involve the right stakeholders",
      "Built the wrong thing and blamed unclear specs"
    ],
    emotionalTone: "Pragmatism, confidence, curiosity, proactiveness"
  },
  "Growth Mindset": {
    greenFlags: [
      "Demonstrates genuine humility",
      "Shows curiosity and initiative in learning",
      "Has concrete learning habits or methods",
      "Names a specific skill or behavior",
      "Applies learning to real work outcomes"
    ],
    redFlags: [
      "Claims no weaknesses or gaps",
      "Gives a fake weakness ('I work too hard')",
      "Can't describe specific learning actions taken",
      "Growth stopped after getting hired/promoted",
      "No current area of active improvement"
    ],
    emotionalTone: "Humility, curiosity, honest self-reflection, ambition"
  },
  "Senior-Level Leadership": {
    greenFlags: [
      "Shows leadership without formal authority",
      "Influences standards and culture",
      "Prioritizes strategically (not everything at once)",
      "Empowers others rather than doing for them",
      "Has concrete examples of team-level impact"
    ],
    redFlags: [
      "Never mentored or helped others grow",
      "Would try to fix everything at once",
      "Focuses only on technical fixes, ignores people/process",
      "Waited to be formally assigned leadership",
      "Can't name a specific person they helped grow"
    ],
    emotionalTone: "Confidence, vision, empathy for team growth, strategic calm"
  },
  "Motivation & Drivers": {
    greenFlags: [
      "Internally motivated (not just money/title)",
      "Passion for problem solving",
      "Intellectual curiosity and drive",
      "Ownership of their own growth",
      "Alignment between role expectations and what they want"
    ],
    redFlags: [
      "Motivated only by salary or job title",
      "Can't articulate what excites them",
      "Everything described drains their energy",
      "Misaligned with the role being offered",
      "No sense of what energizes vs exhausts them"
    ],
    emotionalTone: "Authenticity, energy, passion, forward-looking excitement"
  },
  "Closing Question": {
    greenFlags: [
      "Honest self-awareness — not perfectly polished",
      "Balanced answer (strength + real challenge)",
      "Shows emotional intelligence",
      "Strength aligns with what this role needs",
      "Challenge shows growth in progress"
    ],
    redFlags: [
      "Only lists positives — no real challenge",
      "Challenge is completely irrelevant to the role",
      "Can't say what teammates would praise",
      "Seems defensive or rehearsed",
      "No emotional awareness of how they affect others"
    ],
    emotionalTone: "Groundedness, openness, maturity, emotional intelligence"
  }
};

const QUESTION_TO_SECTION = [
  { keywords: ["about yourself", "career", "journey", "shaped you", "defined your career"], section: "Warm-up & Career Story" },
  { keywords: ["recent project", "latest project", "proud of", "most recent", "personally contributed"], section: "Recent Project Deep Dive" },
  { keywords: ["challenge", "difficult", "did not go as planned", "disagreed"], section: "Challenges & Problem Solving" },
  { keywords: ["team", "collaborate", "collaboration", "teamwork", "stakeholders informed"], section: "Collaboration & Team Dynamics" },
  { keywords: ["failed", "ownership", "mistake", "incident", "accountability"], section: "Ownership & Accountability" },
  { keywords: ["unclear requirements", "ambiguity", "incomplete information", "without having all the answers", "expectations changed"], section: "Working With Ambiguity" },
  { keywords: ["skill", "struggled", "feedback changed", "learned on your own", "growth"], section: "Growth Mindset" },
  { keywords: ["impact went beyond", "influenced a technical decision", "low ownership", "leadership"], section: "Senior-Level Leadership" },
  { keywords: ["motivates you", "engaged", "meaningful", "next role", "environment"], section: "Motivation & Drivers" },
  { keywords: ["teammates", "working style", "proud of", "looking back", "best part of working"], section: "Closing Question" }
];

export function getCriteriaForQuestion(question) {
  const lower = question.toLowerCase();
  for (const mapping of QUESTION_TO_SECTION) {
    if (mapping.keywords.some(kw => lower.includes(kw))) {
      return SECTION_CRITERIA[mapping.section];
    }
  }
  return SECTION_CRITERIA["Warm-up & Career Story"];
}
