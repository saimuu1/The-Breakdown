"""Generate the cached persona write-up for a prediction.

Generated ONCE per prediction and stored in predictions.analysis — never on a
page read, which would wreck latency and the API bill. Regenerated only when the
prediction changes or the persona version bumps.
"""

from collections.abc import Mapping
from dataclasses import dataclass

from app.llm.client import LLMClient
from app.llm.persona import PERSONA_VERSION, SYSTEM_PROMPT, build_user_prompt


@dataclass(frozen=True)
class Analysis:
    text: str
    version: str


def generate_analysis(
    home: str,
    away: str,
    probs: Mapping[str, float],
    edges: list[str],
    client: LLMClient,
    system_prompt: str | None = None,
) -> Analysis:
    """Build a grounded prompt from real model output and get the persona's take.

    Pass `system_prompt` to use a sport-specific persona (e.g. the soccer adapter's
    football-analyst voice). Defaults to the MMA ringside persona.
    """
    sp = system_prompt if system_prompt is not None else SYSTEM_PROMPT
    user_prompt = build_user_prompt(home, away, probs, edges)
    text = client.complete(sp, user_prompt)
    return Analysis(text=text, version=PERSONA_VERSION)
