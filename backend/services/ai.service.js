exports.generateTaskBreakdown = async (goal) => {
  const prompt = `
You are a senior software project manager.

Break down the following goal into clear, actionable development tasks.

Rules:
- Generate between 8 to 15 tasks.
- Each task must be short and specific.
- Assign priority as only one of: Low, Medium, High.
- Do NOT include explanations.
- Respond ONLY in JSON format like this:

[
  { "title": "Task name", "priority": "(Low|Medium|High)" }
]

Goal:
${goal}
`;

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral",
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
      },
    }),
  });

  const data = await response.json();

  const rawText = data.response;

  // Try parsing JSON safely
  try {
    return JSON.parse(rawText);
  } catch (err) {
    throw new Error("AI returned invalid JSON format");
  }
};