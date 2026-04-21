# CodeHelper AI — API Documentation

Base URL (local): `http://localhost:8000`
Base URL (production): `https://your-backend.onrender.com`

---

## Authentication

All endpoints require the `GEMINI_API_KEY` to be set as a server-side environment variable. The frontend uses `VITE_GEMINI_API_KEY` to call Gemini directly. No client-side authentication is required for the demo.

---

## Endpoints

---

### POST /chat

Send a message and receive a domain-constrained AI response.

**URL:** `/chat`
**Method:** `POST`
**Content-Type:** `application/json`

#### Request Body

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `message` | string | Yes | — | The user's question (1–4000 chars) |
| `session_id` | string | No | auto-generated UUID | Session identifier for conversation memory |
| `domain` | string | No | `"general"` | Domain focus: `python`, `javascript`, `algorithms`, `web`, `debugging`, `general` |
| `style` | string | No | `"factual"` | Response style: `factual`, `tutorial`, `concise`, `creative` |
| `temperature` | float | No | `0.7` | Creativity control (0.0 – 1.0) |
| `top_p` | float | No | `0.9` | Nucleus sampling threshold (0.1 – 1.0) |

#### Example Request

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is a closure in JavaScript?",
    "domain": "javascript",
    "style": "tutorial",
    "temperature": 0.5,
    "top_p": 0.8
  }'
```

#### Example Response

```json
{
  "reply": "## What is a Closure?\n\nA **closure** is a function that remembers the variables from its outer (enclosing) scope even after that outer function has finished executing.\n\n### Step-by-step explanation\n\n1. A function is defined inside another function\n2. The inner function references a variable from the outer function\n3. Even after the outer function returns, the inner function still has access to that variable\n\n```javascript\nfunction makeCounter() {\n  let count = 0;          // outer variable\n\n  return function() {     // inner function = closure\n    count++;              // still has access to 'count'\n    return count;\n  };\n}\n\nconst counter = makeCounter();\nconsole.log(counter()); // 1\nconsole.log(counter()); // 2\nconsole.log(counter()); // 3\n```\n\nHere, `counter` is a closure. Even though `makeCounter()` has finished, the returned function still \"closes over\" and remembers the `count` variable.",
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "domain": "javascript",
  "style": "tutorial",
  "turn_count": 1,
  "parameters": {
    "temperature": 0.5,
    "top_p": 0.8
  }
}
```

#### Error Responses

| Status | Meaning | Example body |
|---|---|---|
| `422` | Validation error (e.g., message too long) | `{ "detail": [{ "msg": "ensure this value has at most 4000 characters" }] }` |
| `502` | Gemini API error | `{ "detail": "Gemini API error: 429 Resource exhausted" }` |
| `500` | Internal server error | `{ "detail": "Failed after 3 retries: timeout" }` |

---

### GET /health

Check if the API is running.

**URL:** `/health`
**Method:** `GET`

#### Example Request

```bash
curl http://localhost:8000/health
```

#### Example Response

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "model": "gemini-2.5-flash-preview-05-20"
}
```

---

### GET /faqs

Retrieve FAQ entries from the knowledge base.

**URL:** `/faqs`
**Method:** `GET`

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `domain` | string | No | all | Filter by domain tag (e.g., `python`, `javascript`) |
| `limit` | integer | No | `10` | Max number of results (1–50) |

#### Example Request

```bash
curl "http://localhost:8000/faqs?domain=python&limit=5"
```

#### Example Response

```json
{
  "faqs": [
    {
      "id": 2,
      "category": "Python",
      "question": "How does Python's GIL work?",
      "answer": "The Global Interpreter Lock (GIL) is a mutex in CPython...",
      "tags": ["python", "concurrency", "threads", "performance"]
    },
    {
      "id": 7,
      "category": "Python",
      "question": "What are Python decorators?",
      "answer": "Decorators are functions that wrap other functions...",
      "tags": ["python", "decorators", "functions", "design-patterns"]
    }
  ],
  "count": 2
}
```

---

### DELETE /session/{session_id}

Clear a session's conversation history (reset memory).

**URL:** `/session/{session_id}`
**Method:** `DELETE`

#### Example Request

```bash
curl -X DELETE http://localhost:8000/session/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

#### Example Response

```json
{
  "message": "Session cleared",
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

#### Error Response

```json
{ "detail": "Session not found" }
```

---

### GET /sessions

List all active sessions (admin/debug use).

**URL:** `/sessions`
**Method:** `GET`

#### Example Response

```json
{
  "active_sessions": 3,
  "sessions": [
    { "id": "a1b2c3d4-...", "turns": 5 },
    { "id": "b2c3d4e5-...", "turns": 2 },
    { "id": "c3d4e5f6-...", "turns": 1 }
  ]
}
```

---

### GET /domains

Get supported domains and response styles.

**URL:** `/domains`
**Method:** `GET`

#### Example Response

```json
{
  "domains": {
    "python":     "Python programming",
    "javascript": "JavaScript and TypeScript",
    "algorithms": "Data Structures and Algorithms",
    "web":        "Web Development (HTML, CSS, React, APIs)",
    "debugging":  "Code Debugging and Error Resolution",
    "general":    "Computer Science and Programming in general"
  },
  "styles": {
    "factual":  "Be precise and technical...",
    "tutorial": "Teach step-by-step...",
    "concise":  "Be extremely concise...",
    "creative": "Use creative analogies..."
  }
}
```

---

## Gemini API Direct Call (Frontend)

The frontend can bypass the FastAPI backend and call Gemini directly:

```javascript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: "You are CodeHelper AI, a coding expert..." }]
      },
      contents: [
        { role: "user",  parts: [{ text: "What is recursion?" }] },
        { role: "model", parts: [{ text: "Recursion is..." }] },
        { role: "user",  parts: [{ text: "Give me a Python example." }] }
      ],
      generationConfig: {
        temperature:     0.7,
        topP:            0.9,
        maxOutputTokens: 1024
      }
    })
  }
);

const data = await response.json();
const reply = data.candidates[0].content.parts[0].text;
```

---

## Rate Limits & Quotas

Gemini 2.5 Flash (free tier as of 2025):
- 15 requests per minute (RPM)
- 1,000,000 tokens per minute
- 1,500 requests per day

The backend implements automatic retry with exponential back-off on `429` (rate limit) and `503` (service unavailable) errors.
