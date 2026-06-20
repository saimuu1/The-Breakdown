""""The Breakdown" — the branded analyst persona.

An ORIGINAL character, not a real person: mass-generating content in a named
celebrity's voice runs into right-of-publicity law. The voice lives entirely in
a system prompt, and the write-up is grounded in the structured prediction so it
EXPLAINS the model rather than inventing facts.
"""

from collections.abc import Mapping

PERSONA_VERSION = "breakdown-v6"

SYSTEM_PROMPT = """\
You are "The Breakdown," a sharp, plain-spoken sports analyst. You write ONLY the
written analysis for a prediction page that ALREADY shows win probabilities,
confidence, records, rankings, odds, and stat comparisons. Do NOT restate that
structured data. Your job is the insight a table can't give: matchup dynamics,
style clashes, tactics, momentum, context, and intangibles.

Write like a professional analyst, not a data scientist. Lead with the story; use
a number only to back a point, and never drop a stat without saying why it
matters. Weight it ~60% matchup analysis, ~25% context and narrative, ~15% stats.

Structure into EXACTLY three labeled sections, each header on its own line:
THE STORY: 3-4 sentences -- why this matchup is interesting, the biggest thing
  each side has going for it, and the dynamic likely to define it.
THE KEY TO THE MATCHUP: 4-6 sentences on the single most important factor that
  decides this -- tactics, styles, personnel, coaching, matchups, or game flow --
  and develop it, don't just name it.
THE PICK: name the winner and a confidence %, then 4-5 sentences -- why they're
  favored, the biggest single reason, and the most realistic upset path for the
  other side.

Voice: natural and conversational. Reach for phrasing like "the biggest challenge
for...", "this gets interesting when...", "the key question is...", "what makes
this dangerous for...", "if there's one area to watch...". NEVER write "the data
suggests", "according to the model", "statistically speaking", or "the largest
statistical edge".

Hard rules:
- Ground every claim in the matchup facts provided below; when key players or
  recent results are given, weave them in BY NAME. NEVER invent records, rankings,
  injuries, quotes, or events that aren't provided.
- Adapt naturally to any sport (UFC, soccer, basketball, etc.) without changing
  the structure.
- Aim for 200-215 words total -- do NOT come in under 200. Develop each section
  fully, but stay insightful, not padded; never a stat dump."""

# Differential meta: label, polarity, typical-scale. polarity = +1 when a HIGHER
# value favors the home fighter, -1 when higher is worse (losing streak, age,
# strikes absorbed). scale normalizes magnitudes so a 10cm reach edge and a 0.3
# win-rate edge are ranked comparably.
_EDGE_META: dict[str, tuple[str, int, float]] = {
    "win_rate_dif": ("career win rate", 1, 0.3),
    "win_streak_dif": ("current win streak", 1, 3.0),
    "loss_streak_dif": ("current losing streak", -1, 2.0),
    "n_fights_dif": ("UFC experience (fights)", 1, 8.0),
    "finish_rate_dif": ("finish rate", 1, 0.3),
    "sig_pm_dif": ("significant strikes landed/min", 1, 2.0),
    "sig_absorbed_pm_dif": ("strikes absorbed/min", -1, 2.0),
    "sig_acc_dif": ("striking accuracy", 1, 0.1),
    "sig_def_dif": ("striking defense", 1, 0.1),
    "td_per15_dif": ("takedowns/15min", 1, 2.0),
    "td_acc_dif": ("takedown accuracy", 1, 0.3),
    "sub_per15_dif": ("submission attempts/15min", 1, 1.0),
    "ctrl_frac_dif": ("control-time share", 1, 0.1),
    "age_dif": ("age", -1, 5.0),
    "height_cm_dif": ("height (cm)", 1, 8.0),
    "reach_cm_dif": ("reach (cm)", 1, 8.0),
}


def top_edges(features: Mapping[str, float], home: str, away: str, n: int = 3) -> list[str]:
    """Pick the n most significant differentials and phrase who each favors.

    Ranked by scale-normalized magnitude so stats on different scales compete
    fairly. Uses only the provided values — never invents data.
    """
    scored = []
    for col, (label, polarity, scale) in _EDGE_META.items():
        value = features.get(col)
        if value is None or value != value or value == 0:  # skip None/NaN/zero
            continue
        favored = home if value * polarity > 0 else away
        scored.append((abs(value) / scale, f"{label}: favors {favored} by {abs(value):.1f}"))
    scored.sort(reverse=True)
    return [text for _, text in scored[:n]]


def build_user_prompt(
    home: str,
    away: str,
    probs: Mapping[str, float],
    edges: list[str],
    extra_context: list[str] | None = None,
) -> str:
    edge_text = "; ".join(edges) if edges else "no standout statistical edges"
    if "draw" in probs:
        prob_str = (
            f"{home} {probs['home']:.0%} / draw {probs['draw']:.0%} / {away} {probs['away']:.0%}"
        )
    else:
        prob_str = f"{home} {probs['home']:.0%} / {away} {probs['away']:.0%}"
    lines = [
        f"MATCHUP: {home} (home) vs {away} (away)",
        f"MODEL PROBABILITY (state the favored side's % in THE PICK; don't restate the rest): "
        f"{prob_str}",
        f"SUPPORTING STATS (use sparingly, only to back a point -- do NOT list them): {edge_text}",
    ]
    if extra_context:
        lines.append("FORM & KEY PLAYERS (reference by name): " + "; ".join(extra_context))
    return "\n".join(lines)
