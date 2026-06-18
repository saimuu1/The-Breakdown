// Mirrors backend edge metadata so the match page can show the same
// "who has the edge" breakdown the model and analyst reason over.

type Meta = { label: string; polarity: 1 | -1; scale: number };

const UFC_EDGE_META: Record<string, Meta> = {
  win_rate_dif: { label: "Career win rate", polarity: 1, scale: 0.3 },
  win_streak_dif: { label: "Current win streak", polarity: 1, scale: 3 },
  loss_streak_dif: { label: "Current losing streak", polarity: -1, scale: 2 },
  n_fights_dif: { label: "UFC experience (fights)", polarity: 1, scale: 8 },
  finish_rate_dif: { label: "Finish rate", polarity: 1, scale: 0.3 },
  sig_pm_dif: { label: "Sig. strikes landed/min", polarity: 1, scale: 2 },
  sig_absorbed_pm_dif: { label: "Strikes absorbed/min", polarity: -1, scale: 2 },
  sig_acc_dif: { label: "Striking accuracy", polarity: 1, scale: 0.1 },
  sig_def_dif: { label: "Striking defense", polarity: 1, scale: 0.1 },
  td_per15_dif: { label: "Takedowns/15min", polarity: 1, scale: 2 },
  td_acc_dif: { label: "Takedown accuracy", polarity: 1, scale: 0.3 },
  sub_per15_dif: { label: "Submission attempts/15min", polarity: 1, scale: 1 },
  ctrl_frac_dif: { label: "Control-time share", polarity: 1, scale: 0.1 },
  age_dif: { label: "Age", polarity: -1, scale: 5 },
  height_cm_dif: { label: "Height (cm)", polarity: 1, scale: 8 },
  reach_cm_dif: { label: "Reach (cm)", polarity: 1, scale: 8 },
};

const SOCCER_EDGE_META: Record<string, Meta> = {
  win_rate_dif: { label: "Recent win rate", polarity: 1, scale: 0.3 },
  draw_rate_dif: { label: "Recent draw rate", polarity: 1, scale: 0.2 },
  goals_pg_dif: { label: "Goals scored per game", polarity: 1, scale: 1.0 },
  conceded_pg_dif: { label: "Goals conceded per game", polarity: -1, scale: 1.0 },
  goal_diff_pg_dif: { label: "Goal difference per game", polarity: 1, scale: 1.5 },
  n_games_dif: { label: "Recent games played", polarity: 1, scale: 10 },
};

const EDGE_META_BY_SPORT: Record<string, Record<string, Meta>> = {
  ufc: UFC_EDGE_META,
  soccer: SOCCER_EDGE_META,
};

export interface Edge {
  label: string;
  favored: string;
  magnitude: number;
}

/** Most significant differentials, scale-normalized, with who each favors. */
export function computeEdges(
  diffs: Record<string, number | null>,
  home: string,
  away: string,
  sportId: string = "ufc",
  n = 6,
): Edge[] {
  const meta = EDGE_META_BY_SPORT[sportId] ?? UFC_EDGE_META;
  const scored: { rank: number; edge: Edge }[] = [];
  for (const [key, m] of Object.entries(meta)) {
    const value = diffs[key];
    if (value == null || value === 0 || Number.isNaN(value)) continue;
    scored.push({
      rank: Math.abs(value) / m.scale,
      edge: {
        label: m.label,
        favored: value * m.polarity > 0 ? home : away,
        magnitude: Math.abs(value),
      },
    });
  }
  return scored
    .sort((a, b) => b.rank - a.rank)
    .slice(0, n)
    .map((s) => s.edge);
}
