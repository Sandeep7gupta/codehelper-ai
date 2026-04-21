# CodeHelper AI 🤖

A production-ready, domain-specific generative AI chatbot specialized in **programming and computer science**. Built with React + Vite (frontend) and FastAPI (backend), powered by **Google Gemini 2.5 Flash**.

---

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Architecture & Data Flow](#architecture--data-flow)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Model Parameters Explained](#model-parameters-explained)
- [Prompt Engineering](#prompt-engineering)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [FAQ Knowledge Base](#faq-knowledge-base)

---

## Features

| Feature | Details |
|---|---|
| Domain-constrained AI | Answers only coding/CS questions via system prompt engineering |
| Gemini 2.5 Flash API | Latest Google model — fast, capable, large context window |
| Session-based memory | Full multi-turn conversation history maintained per session |
| FAQ grounding (RAG-lite) | 15 curated FAQs injected into system prompt for grounding |
| Parameter tuning | Live temperature (0–1) and top-p (0.1–1) sliders |
| Response styles | Factual / Tutorial / Concise / Creative modes |
| 6 domain modes | Python, JavaScript, Algorithms, Web Dev, Debugging, All CS |
| Retry logic | Exponential back-off on API failures (3 attempts) |
| Clean modular code | React components + FastAPI routes fully separated |

---

## Project Structure

```
codehelper-ai/
│
├── frontend/                        # React + Vite frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Domain, style, parameter controls
│   │   │   ├── Sidebar.css
│   │   │   ├── ChatHeader.jsx       # Top bar with active mode info
│   │   │   ├── ChatHeader.css
│   │   │   ├── MessageList.jsx      # Chat bubbles, welcome screen, typing indicator
│   │   │   ├── MessageList.css
│   │   │   ├── InputArea.jsx        # Auto-expanding textarea + send button
│   │   │   └── InputArea.css
│   │   ├── utils/
│   │   │   ├── geminiClient.js      # Gemini API caller with retry logic
│   │   │   └── promptEngine.js      # System prompt builder + FAQ injector
│   │   ├── App.jsx                  # Root component, state management
│   │   ├── App.css
│   │   ├── constants.js             # Domains, styles, welcome chips
│   │   └── main.jsx                 # React DOM entry point
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── backend/                         # Python FastAPI backend
│   ├── main.py                      # All routes: /chat, /faqs, /sessions, /health
│   ├── requirements.txt
│   └── .env.example
│
├── data/
│   └── faqs.json                    # 15 domain FAQs (RAG-lite knowledge base)
│
├── config/
│   └── settings.py                  # Centralized app settings from env vars
│
├── render.yaml                      # Render.com deployment config
└── README.md
```

---

## Architecture & Data Flow

```
User types message
       │
       ▼
[React Frontend]
  App.jsx collects: message + domain + style + temperature + topP
       │
       ▼
[promptEngine.js]
  1. buildFaqContext(domain)  → filters FAQs by domain tags (RAG-lite)
  2. buildSystemPrompt()      → combines domain constraint + style guide + FAQ context
       │
       ▼
[geminiClient.js]
  POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
  Headers: { Content-Type: application/json }
  Body: {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: conversationHistory,      ← full multi-turn history
    generationConfig: { temperature, topP, maxOutputTokens }
  }
       │
       ▼
[Gemini 2.5 Flash API]
  Processes domain-constrained prompt with conversation context
       │
       ▼
[geminiClient.js]
  Extracts candidates[0].content.parts[0].text
  Retries up to 3× on failure with exponential back-off
       │
       ▼
[App.jsx]
  Appends model reply to history state
  Adds message to messages state (triggers re-render)
       │
       ▼
[MessageList.jsx]
  Renders bot bubble with formatted text + code blocks
  Shows temperature/top-p params in meta row
```

**OR via FastAPI backend:**
```
React → POST /chat (JSON) → FastAPI → Gemini API → FastAPI → React
```

---

## Local Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- A Google Gemini API key

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/codehelper-ai.git
cd codehelper-ai
```

### 2. Frontend setup

```bash
cd frontend
npm install

# Copy and configure environment variables
cp .env.example .env.local
# Edit .env.local and set VITE_GEMINI_API_KEY

npm run dev
# Opens at http://localhost:3000
```

### 3. Backend setup (optional — frontend calls Gemini directly)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env and set GEMINI_API_KEY

uvicorn main:app --reload --port 8000
# API docs at http://localhost:8000/docs
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|---|---|---|
| `VITE_GEMINI_API_KEY` | Google Gemini API key | required |
| `VITE_API_BASE_URL` | Backend URL (optional) | `http://localhost:8000` |

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | required |
| `HOST` | Server bind host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `*` |

---

## Model Parameters Explained

### Temperature (`0.0 – 1.0`)

Controls the **randomness** of the model's output by scaling the probability distribution over possible next tokens.

| Value | Effect | Best for |
|---|---|---|
| 0.0 – 0.3 | Highly deterministic, repeatable | Factual Q&A, debugging, precise code |
| 0.4 – 0.6 | Balanced accuracy and variety | General coding explanations |
| 0.7 – 1.0 | Creative, varied, sometimes surprising | Analogies, brainstorming, creative style |

### Top-p / Nucleus Sampling (`0.1 – 1.0`)

Restricts the model to the **smallest set of tokens whose cumulative probability exceeds p**. Works alongside temperature.

| Value | Effect | Best for |
|---|---|---|
| 0.1 – 0.5 | Very focused vocabulary, conservative | Precise technical answers |
| 0.6 – 0.8 | Moderate diversity in word choice | Balanced explanations |
| 0.9 – 1.0 | Broad token selection | Creative or tutorial-style output |

**Practical combination guide:**

| Goal | Temperature | Top-p |
|---|---|---|
| Bug fix / factual answer | 0.1 | 0.5 |
| Tutorial / step-by-step | 0.5 | 0.8 |
| Creative explanation | 0.8 | 0.9 |
| Code brainstorming | 0.7 | 1.0 |

---

## Prompt Engineering

CodeHelper AI uses a layered prompt engineering strategy:

### 1. Domain Constraint (Hard boundary)
```
You are CodeHelper AI, an expert assistant specialized in {domain_label}.
Only answer questions related to programming, coding, software development...
If outside domain, politely decline with: "I'm CodeHelper AI..."
```

### 2. Response Style Injection
Each style mode appends a directive:
- **Factual**: "Be precise and technical. Cite standards where relevant."
- **Tutorial**: "Teach step-by-step. Use numbered steps and explain the 'why'."
- **Concise**: "Give the direct answer first, then a brief example only if essential."
- **Creative**: "Use creative analogies and memorable metaphors."

### 3. RAG-lite FAQ Grounding
The `buildFaqContext(domain)` function filters the 15-FAQ knowledge base by matching the selected domain to FAQ tags and categories. Up to 6 relevant Q&A pairs are injected into the system prompt:
```
GROUNDING KNOWLEDGE BASE:
Q: What is a closure in JavaScript?
A: A closure is a function that retains access to its lexical scope...
```
This grounds the model in accurate, pre-validated answers and reduces hallucination.

### 4. Multi-turn Memory
The full conversation history is maintained in React state and passed to each API call as the `contents` array, enabling coherent multi-turn dialogue:
```json
"contents": [
  { "role": "user",  "parts": [{ "text": "What is recursion?" }] },
  { "role": "model", "parts": [{ "text": "Recursion is..." }] },
  { "role": "user",  "parts": [{ "text": "Can you give me an example?" }] }
]
```

---

## API Documentation

### `POST /chat`

Main chat endpoint.

**Request body:**
```json
{
  "message":     "What is a closure in JavaScript?",
  "session_id":  "optional-uuid-string",
  "domain":      "javascript",
  "style":       "factual",
  "temperature": 0.7,
  "top_p":       0.9
}
```

**Response:**
```json
{
  "reply":       "A closure is a function that retains access to...",
  "session_id":  "a1b2c3d4-...",
  "domain":      "javascript",
  "style":       "factual",
  "turn_count":  1,
  "parameters":  { "temperature": 0.7, "top_p": 0.9 }
}
```

### `GET /faqs?domain=python&limit=5`

Returns FAQ entries from the knowledge base.

### `DELETE /session/{session_id}`

Clears a session's conversation history.

### `GET /health`

Returns API status and model name.

### `GET /domains`

Returns all supported domains and styles.

Full interactive API docs available at `http://localhost:8000/docs` (Swagger UI) when running locally.

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build

# Install Vercel CLI
npm i -g vercel
vercel --prod

# Set environment variable in Vercel dashboard:
# VITE_GEMINI_API_KEY = your-key
```

### Backend → Render.com

1. Push your repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Build command: `pip install -r backend/requirements.txt`
5. Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variable: `GEMINI_API_KEY`

The included `render.yaml` automates this configuration.

---

## FAQ Knowledge Base

The `data/faqs.json` file contains 15 curated Q&A pairs across these categories:

- **JavaScript** — Closures, async/await, strict equality
- **Python** — GIL, decorators, list comprehension
- **Algorithms** — Big O, binary search, memoization, DFS/BFS
- **Data Structures** — Stack vs Queue
- **Web Development** — REST vs GraphQL, virtual DOM, CORS
- **Debugging** — Null pointer exceptions

To add more FAQs, append entries to the `faqs` array in `data/faqs.json` following the existing schema. The `buildFaqContext()` function will automatically pick them up based on domain tag matching.

---

## Credits

Built with Google Gemini 2.5 Flash API, React 18, Vite 5, and FastAPI.
