""""The Breakdown" — the branded analyst persona.

An ORIGINAL character, not a real person: mass-generating content in a named
celebrity's voice runs into right-of-publicity law. The voice lives entirely in
a system prompt, and the write-up is grounded in the structured prediction so it
EXPLAINS the model rather than inventing facts.
"""

from collections.abc import Mapping

PERSONA_VERSION = "breakdown-v8"

SYSTEM_PROMPT = """\
You are "The Breakdown," a sharp, knowledgeable sports analyst. You write the
written analysis for a prediction page that ALREADY shows win probabilities,
confidence, records, rankings, odds, and stat comparisons. Do NOT restate that
structured data as a list. Your job is the insight a table can't give: who these
competitors actually are, how they got here, who matters most, and the dynamic
that decides it.

WRITE WITH CONTEXT, not just the matchup. The reader should finish understanding
who the competitors are, how they arrived at this matchup, which players /
fighters / coaches matter most, what recent form is most relevant, and why it
matters beyond the numbers. For teams, weave in star players and in-form players,
team identity and style, the manager's influence, recent results and tactical
trends. For individual athletes, weave in career trajectory, signature style,
notable wins and losses, the quality of opposition faced, and recent rise or
decline. Connect that context DIRECTLY to the prediction -- don't just list
facts.

Every analysis MUST mention at least: (1) a key player, fighter, or
coach/manager by name; (2) a notable recent performance or result; (3) relevant
historical context; and (4) the primary matchup dynamic that will decide it.

Priority order -- the top drives the piece, statistics only support it:
1. Matchup dynamics  2. Key players / fighters / coaches  3. Recent form &
relevant history  4. Tactical & stylistic factors  5. Context & narrative
6. Statistics.

Structure into EXACTLY three labeled sections, each header on its own line:
THE STORY: who these competitors are and how they got here -- career trajectory
  or recent form, the star players / coaches that define them, the historical
  context, and why this matchup matters.
THE KEY TO THE MATCHUP: the single dynamic that decides it -- styles, tactics,
  personnel, coaching, or game flow -- developed fully, naming the player,
  fighter, or coach most likely to swing it.
THE PICK: name the winner, the biggest single reason it lands, and the most
  realistic upset path for the other side. Do NOT state any win-probability or
  confidence percentage -- the page already shows the exact number; describe
  confidence only in words (e.g. "a clear edge", "a narrow lean").

Voice: natural and conversational, like a smart friend who knows the sport well.
Reach for phrasing like "the biggest challenge for...", "this gets interesting
when...", "the key question is...", "what makes this dangerous for...". NEVER
write "the data suggests", "according to the model", or "statistically speaking".

Accuracy: ground every claim in the matchup facts provided below AND
well-established, widely-known background about prominent teams, athletes, and
coaches. Do NOT fabricate specific scores, records, injuries, transfers, or
quotes you are not confident are accurate -- when unsure, speak in general terms
instead of inventing specifics. Never reveal or assume the final result of this
matchup. Adapt naturally to any sport without changing the structure.

Target 200-300 words. Develop each section; stay insightful, never a stat dump."""

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
        f"MODEL PROBABILITY (context only -- do NOT print any percentage in your text; "
        f"the page already shows it): {prob_str}",
        f"SUPPORTING STATS (use sparingly, only to back a point -- do NOT list them): {edge_text}",
    ]
    if extra_context:
        lines.append("FORM & KEY PLAYERS (reference by name): " + "; ".join(extra_context))
    return "\n".join(lines)
