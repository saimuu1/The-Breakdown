"""Provider-agnostic LLM client.

The persona is grounded in structured model output, so it doesn't depend on any
particular model's world knowledge — which lets us run a free, OpenAI-compatible
provider (Groq by default) behind this Protocol and swap vendors by changing one
class. Services depend on `LLMClient`, never on a vendor SDK.
"""

import time
from typing import Protocol

import httpx

from app.config import get_settings

# Transient statuses worth retrying. Free LLM tiers throttle with 429 (and, on
# Google, sometimes a transient 403) plus the usual 5xx.
_RETRYABLE = {403, 429, 500, 502, 503, 504}


class LLMClient(Protocol):
    def complete(self, system: str, user: str) -> str: ...


class OpenAICompatibleClient:
    """Works with any OpenAI-compatible chat API (Groq, OpenAI, together, etc.)."""

    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        timeout: float = 30.0,
        max_retries: int = 5,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._model = model
        self._timeout = timeout
        self._max_retries = max_retries

    def complete(self, system: str, user: str) -> str:
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.7,
            # Headroom so "thinking" models (e.g. Gemini 2.5) don't spend the
            # whole budget reasoning and truncate the visible answer.
            "max_tokens": 800,
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}

        last_exc: Exception | None = None
        for attempt in range(self._max_retries):
            resp = httpx.post(
                f"{self._base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=self._timeout,
            )
            if resp.status_code in _RETRYABLE and attempt < self._max_retries - 1:
                # Honor Retry-After when present, else exponential backoff.
                delay = float(resp.headers.get("retry-after", 2**attempt))
                time.sleep(min(delay, 30.0))
                last_exc = httpx.HTTPStatusError(
                    f"retryable {resp.status_code}", request=resp.request, response=resp
                )
                continue
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()

        raise last_exc  # exhausted retries


def get_llm_client() -> LLMClient:
    s = get_settings()
    if not s.llm_api_key:
        raise RuntimeError("LLM_API_KEY is not set — cannot generate analysis.")
    return OpenAICompatibleClient(s.llm_base_url, s.llm_api_key, s.llm_model)
