/**
 * geminiClient.js
 * Handles all communication with the Google Gemini API.
 * Includes retry logic and error handling.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL          = "gemini-2.5-flash";
const BASE_URL       = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_RETRIES    = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Sleep utility for retry back-off.
 */
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Call the Gemini API with conversation history and generation config.
 *
 * @param {object}   options
 * @param {string}   options.systemPrompt  - Domain-constrained system instruction
 * @param {Array}    options.history        - Conversation history [{role, parts}]
 * @param {number}   options.temperature    - 0.0–1.0, controls randomness
 * @param {number}   options.topP           - 0.1–1.0, nucleus sampling
 * @returns {Promise<string>}               - Model's text response
 */
export async function callGemini({ systemPrompt, history, temperature, topP }) {
  const url     = `${BASE_URL}?key=${GEMINI_API_KEY}`;
  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents:           history,
    generationConfig: {
      temperature:     parseFloat(temperature),
      topP:            parseFloat(topP),
      maxOutputTokens: 1024,
    },
  };

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error?.message || `HTTP ${res.status}: ${res.statusText}`
        );
      }

      const data       = await res.json();
      const candidates = data.candidates ?? [];

      if (!candidates.length) {
        throw new Error("No candidates returned by the API.");
      }

      const text = candidates[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from model.");

      return text;
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini] Attempt ${attempt} failed:`, err.message);

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt); // exponential back-off
      }
    }
  }

  throw new Error(`Failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}
