// OpenRouter API client with retry logic
const fetch = global.fetch || require("node-fetch");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function callOpenRouter({ messages, temperature, topP, model }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured in .env");

  const body = {
    model: model || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
    messages,
    temperature,
    top_p: topP,
  };

  const maxAttempts = 3;
  let lastErr = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.HTTP_REFERER || "http://localhost:3000",
          "X-Title": "CodeHelper AI",
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        return { error: "Rate limit reached. Please wait and try again." };
      }
      if (!res.ok) {
        lastErr = `OpenRouter ${res.status}: ${await res.text()}`;
        if (attempt < maxAttempts && res.status >= 500) {
          await new Promise((r) => setTimeout(r, 400 * attempt));
          continue;
        }
        return { error: lastErr };
      }

      const json = await res.json();
      const reply = json.choices?.[0]?.message?.content?.trim() || "";
      return { reply };
    } catch (e) {
      lastErr = e.message;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
    }
  }
  return { error: `Failed after ${maxAttempts} attempts: ${lastErr}` };
}

module.exports = { callOpenRouter };
