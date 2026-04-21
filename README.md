# CodeHelper AI

A domain-specific generative AI chatbot that answers **only programming and software development** questions. Built with vanilla **HTML/CSS/JS** on the frontend, **Node.js + Express** on the backend, and **OpenRouter** as the LLM provider.

## Features

- 🎯 **Domain restriction** via prompt engineering — politely refuses non-programming questions
- 📚 **FAQ-grounded responses** (RAG-lite) — relevant Q&A from `data/faqs.json` are injected into the prompt
- 🧠 **Session-based memory** — multi-turn conversations stored in-memory per session
- 🎛️ **Tunable parameters** — Temperature (0–1) and Top-p (0–1) sliders
- 🎨 **Response styles** — Factual / Creative / Beginner-friendly
- 💾 **Chat history persistence** via `localStorage`
- 🌗 **Dark mode toggle**
- 🔁 **Retry logic** with exponential backoff on transient errors

## Project Structure

```
project-root/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── backend/
│   ├── server.js
│   ├── routes/chat.js
│   └── services/openrouter.js
├── data/
│   └── faqs.json
├── config/
│   └── .env.example
├── package.json
└── README.md
```

## Setup

### 1. Install Node.js (v18+)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure your OpenRouter key
```bash
cp config/.env.example config/.env
```
Then edit `config/.env` and paste your key from <https://openrouter.ai/keys>.

### 4. Run
```bash
npm start
```

Open <http://localhost:3000> in Google Chrome.

## API

### `POST /chat`
**Request body:**
```json
{
  "messages": [
    { "role": "user", "content": "Explain closures in JavaScript" }
  ],
  "temperature": 0.7,
  "topP": 0.9,
  "style": "beginner",
  "sessionId": "default"
}
```

**Response:**
```json
{
  "reply": "A closure is a function that...",
  "usedFaqs": ["What is a closure in JavaScript?"],
  "params": { "temperature": 0.7, "topP": 0.9, "style": "beginner" }
}
```

**Errors** return JSON with `{ "error": "..." }` and an appropriate HTTP status.

## How it Works (Data Flow)

```
[Browser UI]  ─POST /chat─►  [Express server]
                                  │
                                  ├─ Look up top-3 FAQs (keyword overlap) → inject into system prompt
                                  ├─ Build system prompt (domain restriction + style + FAQ context)
                                  ├─ Append session memory (last 12 turns)
                                  └─ Call OpenRouter API
                                          │
                                          ▼
                            [OpenRouter → chosen LLM]
                                          │
                                          ▼
                              [Response back to UI]
```

### Why the FAQ grounding helps
By injecting relevant Q&A pairs from `data/faqs.json` into the system prompt, the model has authoritative reference material in-context. This reduces hallucinations on common topics and steers the answer style. To extend the knowledge base, just add more entries to `faqs.json`.

### Model parameters explained
- **Temperature (0–1)** — controls randomness. `0` is deterministic; `1` is highly varied. Low for factual, higher for creative.
- **Top-p (0–1)** — nucleus sampling. Restricts the model to the smallest set of tokens whose cumulative probability ≥ p. Lower = more focused.

## Switching models
Edit `OPENROUTER_MODEL` in `config/.env`. Tested values:
- `openai/gpt-4o-mini` (fast, cheap, default)
- `mistralai/mixtral-8x7b-instruct`
- `meta-llama/llama-3-8b-instruct`

## Deployment
- **Frontend**: deploy `frontend/` to Netlify / Vercel as a static site. Update `API_URL` in `script.js` to point at your backend.
- **Backend**: deploy to Render / Railway / Fly.io. Set `OPENROUTER_API_KEY` as an environment variable.

## License
MIT
