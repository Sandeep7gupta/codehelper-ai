// /chat route — domain-restricted programming assistant
const express = require("express");
const fs = require("fs");
const path = require("path");
const { callOpenRouter } = require("../services/openrouter");

const router = express.Router();

// Load FAQs once at startup
const faqsPath = path.join(__dirname, "..", "..", "data", "faqs.json");
let FAQS = [];
try {
  FAQS = JSON.parse(fs.readFileSync(faqsPath, "utf-8")).faqs || [];
  console.log(`Loaded ${FAQS.length} FAQs`);
} catch (e) {
  console.warn("Could not load FAQs:", e.message);
}

const STOP = new Set(["the","a","an","is","are","of","to","in","on","for","and","or","what","how","do","does","i","you","it","this","that","with","my","be","can","should","use","using","when","why","which"]);
function tokenize(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9+#.\s]/g, " ").split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
}
function retrieveRelevantFaqs(query, k = 3) {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  return FAQS.map(faq => {
    const set = new Set(tokenize(faq.q + " " + faq.a));
    let score = 0;
    for (const t of tokens) if (set.has(t)) score++;
    return { faq, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, k).map(s => s.faq);
}

// Session-based memory: keyed by sessionId, falls back to single in-memory store
const sessions = new Map();
function getSession(id) {
  if (!sessions.has(id)) sessions.set(id, []);
  return sessions.get(id);
}

const STYLE_INSTRUCTIONS = {
  factual: "Respond in a precise, technically accurate tone. Use minimal prose, prefer code examples and bullet points.",
  creative: "Use engaging analogies and creative comparisons to explain ideas, while keeping all code correct.",
  beginner: "Explain like the user is new to programming. Define jargon on first use, walk through code line-by-line, and keep examples short.",
};

const BASE_SYSTEM = `You are CodeHelper AI, a programming expert.
Only answer questions related to coding, programming, software development, computer science, debugging, system design, devops, databases, algorithms, data structures, and developer tooling.
If a question is outside this domain, politely refuse with: "I'm CodeHelper AI and I can only help with programming and software development questions. Could you ask me something code-related?"
Always format code using fenced markdown code blocks with the language tag.
Be accurate. If you are unsure, say so rather than guessing.`;

router.post("/", async (req, res) => {
  try {
    const {
      messages = [],
      temperature = 0.7,
      topP = 0.9,
      style = "factual",
      sessionId = "default",
    } = req.body || {};

    // Validate
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" });
    }
    const t = Math.max(0, Math.min(2, Number(temperature)));
    const p = Math.max(0, Math.min(1, Number(topP)));
    const s = ["factual", "creative", "beginner"].includes(style) ? style : "factual";

    // Update session memory with the latest user message
    const session = getSession(sessionId);
    const last = messages[messages.length - 1];
    if (last && last.role === "user") session.push(last);
    // Keep last 12
    while (session.length > 12) session.shift();

    // FAQ grounding
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    const relevant = lastUser ? retrieveRelevantFaqs(lastUser.content, 3) : [];
    const faqContext = relevant.length
      ? `\n\nKnowledge base — relevant FAQs you may use as grounding:\n${relevant.map((f, i) => `${i+1}. Q: ${f.q}\n   A: ${f.a}`).join("\n")}`
      : "";

    const systemPrompt = BASE_SYSTEM + "\n\nResponse style: " + STYLE_INSTRUCTIONS[s] + faqContext;

    const result = await callOpenRouter({
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: t,
      topP: p,
    });

    if (result.error) {
      return res.status(502).json({ error: result.error });
    }

    // Save assistant reply to session
    session.push({ role: "assistant", content: result.reply });

    res.json({
      reply: result.reply,
      usedFaqs: relevant.map(f => f.q),
      params: { temperature: t, topP: p, style: s },
    });
  } catch (e) {
    console.error("chat error:", e);
    res.status(500).json({ error: e.message || "Internal error" });
  }
});

module.exports = router;
