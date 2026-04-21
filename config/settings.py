"""
config/settings.py
Application-wide configuration loaded from environment variables.
"""

import os
from dataclasses import dataclass

@dataclass
class Settings:
    # Gemini API
    gemini_api_key: str   = os.getenv("GEMINI_API_KEY", "")
    gemini_model:   str   = "gemini-2.5-flash-preview-05-20"
    gemini_base_url: str  = "https://generativelanguage.googleapis.com/v1beta/models"
    max_output_tokens: int = 1024
    request_timeout:   int = 30

    # Session management
    max_history_turns:  int = 20     # max turns kept in session memory
    max_sessions:       int = 1000   # evict oldest when exceeded

    # Server
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))

    # CORS
    allowed_origins: list = None

    def __post_init__(self):
        origins_env = os.getenv("ALLOWED_ORIGINS", "*")
        self.allowed_origins = [o.strip() for o in origins_env.split(",")]


settings = Settings()
