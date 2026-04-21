"""
CodeHelper AI - FastAPI Backend
================================
Domain-specific generative AI chatbot backend using Google Gemini API.
Supports session memory, FAQ grounding, prompt engineering, and parameter tuning.
"""

import os
import json
import uuid
import logging
from pathlib import Path
from typing import Optional
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── App init ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CodeHelper AI API",
    description="Domain-specific generative AI chatbot for coding and CS topics",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    
    allow_origins=["*"],          # Restrict in production to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ────────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBQDkFfDmAtcixSQgx6Lb_SbPN9_tqtFWk")
GEMINI_MODEL   = "gemini-2.5-flash-preview-05-20"
GEMINI_URL     = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
MAX_TOKENS     = 1024
MAX_HISTORY    = 20            # max turns kept in session memory
TIMEOUT_SEC    = 30

# ── In-memory session store ───────────────────────────────────────────────────
# { session_id: [{"role": "user"|"model", "parts": [{"text": "..."}]}, ...] }
sessions: dict[str, list] = {}

# ── Load FAQ knowledge base ───────────────────────────────────────────────────
FAQ_PATH = Path(__file__).parent.parent / "data" / "faqs.json"
try:
    with open(FAQ_PATH, "r") as f:
        faq_data = json.load(f)
    FAQS = faq_data.get("faqs", [])
    logger.info(f"Loaded {len(FAQS)} FAQs from knowledge base")
except FileNotFoundError:
    FAQS = []
    logger.warning("FAQ file not found — running without knowledge base")

# ── Domain configurations ─────────────────────────────────────────────────────
DOMAINS = {
    "python":     "Python programming",
    "javascript": "JavaScript and TypeScript",
    "algorithms": "Data Structures and Algorithms",
    "web":        "Web Development (HTML, CSS, React, APIs)",
    "debugging":  "Code Debugging and Error Resolution",
    "general":    "Computer Science and Programming in general",
}

RESPONSE_STYLES = {
    "factual":  "Be precise and technical. Cite standards where relevant. Avoid unnecessary filler.",
    "tutorial": "Teach step-by-step. Use numbered steps, code examples, and explain the 'why'.",
    "concise":  "Be extremely concise. Give the direct answer first, then a brief example if needed.",
    "creative": "Use creative analogies and memorable metaphors while staying technically accurate.",
}

# ── Pydantic models ───────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message:     str              = Field(..., min_length=1, max_length=4000)
    session_id:  Optional[str]   = None
    domain:      str              = Field(default="general")
    style:       str              = Field(default="factual")
    temperature: float            = Field(default=0.7, ge=0.0, le=1.0)
    top_p:       float            = Field(default=0.9, ge=0.1, le=1.0)

class ChatResponse(BaseModel):
    reply:      str
    session_id: str
    domain:     str
    style:      str
    turn_count: int
    parameters: dict

class HealthResponse(BaseModel):
    status:  str
    version: str
    model:   str

class FAQResponse(BaseModel):
    faqs:  list
    count: int

# ── Helpers ───────────────────────────────────────────────────────────────────
def build_faq_context(domain: str) -> str:
    """
    RAG-lite: filter FAQs by domain/tags and build a context string
    to inject into the system prompt.
    """
    domain_tag = domain.lower()
    relevant = [
        f for f in FAQS
        if domain_tag in [t.lower() for t in f.get("tags", [])]
        or f.get("category", "").lower() in domain_tag
        or domain_tag == "general"
    ]
    if not relevant:
        relevant = FAQS[:5]          # fallback: top 5

    lines = []
    for faq in relevant[:6]:        # limit to 6 per request
        lines.append(f"Q: {faq['question']}\nA: {faq['answer']}")
    return "\n\n".join(lines)


def build_system_prompt(domain: str, style: str) -> str:
    """Construct the domain-constrained system prompt with FAQ grounding."""
    domain_label = DOMAINS.get(domain, DOMAINS["general"])
    style_guide  = RESPONSE_STYLES.get(style, RESPONSE_STYLES["factual"])
    faq_context  = build_faq_context(domain)

    return f"""You are CodeHelper AI, an expert assistant specialized in {domain_label}.

DOMAIN CONSTRAINT:
Only answer questions related to programming, coding, software development, algorithms,
data structures, debugging, and computer science concepts. If a question is clearly outside
this domain, politely decline with:
"I'm CodeHelper AI, focused on coding and CS topics. I can't help with that, but feel
free to ask any programming question!"

RESPONSE STYLE:
{style_guide}

GROUNDING KNOWLEDGE BASE:
Use the following domain FAQs to ground your answers. Prefer this knowledge when relevant:

{faq_context}

FORMATTING:
- Use triple-backtick code blocks with language tags for all code
- Structure longer answers with brief headers
- Be accurate — validate your code examples mentally before presenting them
- Encourage developers at all skill levels

Current domain focus: {domain_label}
"""


def trim_history(history: list) -> list:
    """Keep only the last MAX_HISTORY turns to respect context limits."""
    if len(history) > MAX_HISTORY:
        return history[-MAX_HISTORY:]
    return history


async def call_gemini(
    system_prompt: str,
    history: list,
    temperature: float,
    top_p: float,
) -> str:
    """Call the Gemini API with retry logic."""
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": history,
        "generationConfig": {
            "temperature":     temperature,
            "topP":            top_p,
            "maxOutputTokens": MAX_TOKENS,
        },
    }

    headers = {"Content-Type": "application/json"}
    url     = f"{GEMINI_URL}?key={GEMINI_API_KEY}"

    for attempt in range(3):          # retry up to 3 times
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_SEC) as client:
                res = await client.post(url, json=payload, headers=headers)
                res.raise_for_status()
                data = res.json()

            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned by Gemini API")

            text = candidates[0]["content"]["parts"][0]["text"]
            return text

        except httpx.HTTPStatusError as e:
            logger.error(f"Gemini HTTP error (attempt {attempt+1}): {e.response.status_code}")
            if e.response.status_code in (429, 503) and attempt < 2:
                import asyncio
                await asyncio.sleep(2 ** attempt)   # exponential back-off
                continue
            raise HTTPException(
                status_code=502,
                detail=f"Gemini API error: {e.response.text}",
            )
        except Exception as e:
            logger.error(f"Unexpected error (attempt {attempt+1}): {e}")
            if attempt < 2:
                import asyncio
                await asyncio.sleep(1)
                continue
            raise HTTPException(status_code=500, detail=str(e))

    raise HTTPException(status_code=500, detail="Failed after 3 retries")


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/", response_model=HealthResponse)
async def root():
    return HealthResponse(status="ok", version="1.0.0", model=GEMINI_MODEL)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="healthy", version="1.0.0", model=GEMINI_MODEL)


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Main chat endpoint.
    - Creates or retrieves session memory
    - Builds domain-constrained system prompt with FAQ grounding
    - Calls Gemini API with conversation history
    - Returns structured response
    """
    # Session management
    session_id = req.session_id or str(uuid.uuid4())
    if session_id not in sessions:
        sessions[session_id] = []
        logger.info(f"New session: {session_id}")

    history = sessions[session_id]

    # Add user message to history
    history.append({"role": "user", "parts": [{"text": req.message}]})
    history = trim_history(history)

    # Build prompt
    system_prompt = build_system_prompt(req.domain, req.style)

    # Call Gemini
    reply = await call_gemini(
        system_prompt=system_prompt,
        history=history,
        temperature=req.temperature,
        top_p=req.top_p,
    )

    # Save assistant reply to history
    history.append({"role": "model", "parts": [{"text": reply}]})
    sessions[session_id] = history

    logger.info(f"Session {session_id[:8]}… | domain={req.domain} | turns={len(history)//2}")

    return ChatResponse(
        reply=reply,
        session_id=session_id,
        domain=req.domain,
        style=req.style,
        turn_count=len(history) // 2,
        parameters={"temperature": req.temperature, "top_p": req.top_p},
    )


@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear a specific session's conversation history."""
    if session_id in sessions:
        del sessions[session_id]
        return {"message": "Session cleared", "session_id": session_id}
    raise HTTPException(status_code=404, detail="Session not found")


@app.get("/sessions")
async def list_sessions():
    """List active sessions (for debugging/admin)."""
    return {
        "active_sessions": len(sessions),
        "sessions": [
            {"id": sid, "turns": len(hist) // 2}
            for sid, hist in sessions.items()
        ],
    }


@app.get("/faqs", response_model=FAQResponse)
async def get_faqs(domain: Optional[str] = None, limit: int = 10):
    """Return FAQs from the knowledge base, optionally filtered by domain."""
    if domain:
        filtered = [
            f for f in FAQS
            if domain.lower() in [t.lower() for t in f.get("tags", [])]
            or f.get("category", "").lower() == domain.lower()
        ]
    else:
        filtered = FAQS
    return FAQResponse(faqs=filtered[:limit], count=len(filtered[:limit]))


@app.get("/domains")
async def get_domains():
    """Return supported domains and response styles."""
    return {"domains": DOMAINS, "styles": RESPONSE_STYLES}
