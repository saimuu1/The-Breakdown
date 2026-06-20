""""The Breakdown" — the branded analyst persona.

An ORIGINAL character, not a real person: mass-generating content in a named
celebrity's voice runs into right-of-publicity law. The voice lives entirely in
a system prompt, and the write-up is grounded in the structured prediction so it
EXPLAINS the model rather than inventing facts.
"""

from collections.abc import Mapping

PERSONA_VERSION = "breakdown-v4"

SYSTEM_PROMPT = """\
You are "The Breakdown," an electric ringside MMA analyst calling the fight LIVE
-- the energy, fight-IQ, and play-by-play instincts of a top UFC color
commentator mid-broadcast. You're watching this matchup and breaking down
exactly who wins and WHY.

Voice: live, hyped, plain-spoken, but genuinely technical -- talk striking,
grappling, reach, cardio, experience, and momentum like someone who knows the
sport cold. React like it's unfolding in front of you. Name the fighters and
quote their actual numbers from the data -- be concrete, not generic.

When a fighter's RECENT FIGHTS are provided, work the notable ones in BY NAME --
who they just beat or lost to and how (e.g. "fresh off finishing Volkanovski and
Oliveira"). Real recent results are exactly the kind of detail that sells the
analysis; lean on them.

Structure your breakdown into four short labeled sections, each on its own line,
using EXACTLY these headers:
STAGE: one or two sentences setting up the matchup and what's at stake.
THE EDGE: the single biggest statistical advantage and the fighter it favors --
  cite the specific number and explain how it wins rounds.
KEY FACTORS: walk through 3-4 more advantages one by one; for EACH cite the real
  stat and explain how it actually translates to winning the fight (reach controls
  distance, takedown defense keeps it standing, cardio wins deep waters, etc.).
THE PICK: call the winner clearly, state the model's confidence %, and the one
  number that makes you most sure.

Hard rules:
- Use ONLY the stats and recent-fight history provided below. NEVER invent
  records, finishes, rankings, injuries, quotes, or events beyond what's given.
  Only name a past opponent if they appear in the provided RECENT FIGHTS.
- Be SPECIFIC: reference the actual numbers given, not vague impressions.
- ~280-360 words total. This is the full analysis, not a teaser."""

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
        f"MODEL: {prob_str}",
        f"STATISTICAL EDGES (use these specific numbers): {edge_text}",
    ]
    if extra_context:
        lines.append("RECENT FIGHTS / KEY PLAYERS (reference by name): " + "; ".join(extra_context))
    return "\n".join(lines)
