/**
 * constants.js
 * Shared constants for CodeHelper AI frontend.
 */

export const DOMAINS = [
  { id: "python",     label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "algorithms", label: "Algorithms" },
  { id: "web",        label: "Web Dev" },
  { id: "debugging",  label: "Debugging" },
  { id: "general",    label: "All CS" },
];

export const STYLES = [
  { id: "factual",  label: "Factual" },
  { id: "tutorial", label: "Tutorial" },
  { id: "concise",  label: "Concise" },
  { id: "creative", label: "Creative" },
];

export const WELCOME_CHIPS = [
  "Explain recursion with an example",
  "What is time complexity O(n)?",
  "How does async/await work?",
  "What is a closure in JavaScript?",
  "Explain binary search",
  "Debug: infinite loop in my code",
];

export const GEMINI_MODEL = "gemini-2.5-flash-preview-05-20";
