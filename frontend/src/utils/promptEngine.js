/**
 * promptEngine.js
 * Domain-specific prompt engineering for CodeHelper AI.
 * Implements RAG-lite FAQ grounding and response style customization.
 */

// import faqs from "../../data/faqs.json";
import faqs from "/src/data/faqs.json";

// ── Domain labels ─────────────────────────────────────────────────────────────
const DOMAIN_LABELS = {
  python:     "Python programming",
  javascript: "JavaScript and TypeScript",
  algorithms: "Data Structures and Algorithms",
  web:        "Web Development (HTML, CSS, React, APIs)",
  debugging:  "Code Debugging and Error Resolution",
  general:    "Computer Science and Programming in general",
};

// ── Response style directives ─────────────────────────────────────────────────
const STYLE_GUIDES = {
  factual:  "Be precise and technical. Cite standards or specifications where relevant. Avoid filler.",
  tutorial: "Teach step-by-step. Use numbered steps, code examples, and explain the 'why' behind each concept.",
  concise:  "Be extremely concise. Give the direct answer first, then one brief code snippet only if essential.",
  creative: "Use creative analogies and memorable metaphors. Make it engaging while staying technically accurate.",
};

/**
 * Filter FAQs relevant to the selected domain.
 * This is the RAG-lite retrieval step.
 *
 * @param {string} domain - Selected domain id
 * @returns {string}       - Formatted FAQ context string
 */
function buildFaqContext(domain) {
  const domainTag = domain.toLowerCase();

  // Filter FAQs by matching tags or category
  const relevant = faqs.faqs.filter((faq) => {
    const tags     = (faq.tags ?? []).map((t) => t.toLowerCase());
    const category = (faq.category ?? "").toLowerCase();
    return (
      tags.includes(domainTag) ||
      category.includes(domainTag) ||
      domainTag === "general"
    );
  });

  // Take up to 6 relevant FAQs to keep the prompt size manageable
  const selected = (relevant.length ? relevant : faqs.faqs).slice(0, 6);

  return selected
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");
}

/**
 * Build the complete system prompt for Gemini.
 * Combines domain constraint + response style + FAQ grounding.
 *
 * @param {string} domain - Domain id (e.g. "python")
 * @param {string} style  - Response style id (e.g. "factual")
 * @returns {string}       - Full system instruction string
 */
export function buildSystemPrompt(domain, style) {
  const domainLabel = DOMAIN_LABELS[domain] ?? DOMAIN_LABELS.general;
  const styleGuide  = STYLE_GUIDES[style]   ?? STYLE_GUIDES.factual;
  const faqContext  = buildFaqContext(domain);

  return `You are CodeHelper AI, an expert assistant specialized in ${domainLabel}.

DOMAIN CONSTRAINT:
Only answer questions related to programming, coding, software development, algorithms,
data structures, debugging, and computer science concepts. If a question is clearly
outside this domain, politely decline with: "I'm CodeHelper AI, focused on coding and
CS topics. I can't help with that, but feel free to ask any programming question!"

RESPONSE STYLE:
${styleGuide}

GROUNDING KNOWLEDGE BASE (use this to ground your answers when relevant):
${faqContext}

FORMATTING RULES:
- Use triple-backtick code blocks with language tags for all code snippets
- Structure longer answers with brief markdown headers
- Always validate your code examples mentally before presenting them
- Be encouraging to developers at all skill levels

Current domain focus: ${domainLabel}`;
}
