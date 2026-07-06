export async function checkModel() {
  if (!("LanguageModel" in self)) {
    return { status: "unsupported" };
  }
  const availability = await LanguageModel.availability({
    expectedInputs: [{ type: "text", languages: ["en"] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }],
  });
  return { status: availability };
}
