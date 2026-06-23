// Database types mirroring supabase/migrations. Kept in sync by hand here; can
// be regenerated with `supabase gen types typescript --project-id <ref>` once
// the CLI is linked.

export type OutcomeKind = "binary" | "three_way";
export type Tier = "free" | "pro";
export type Plan = "free" | "pro";

export interface Sport {
  id: string; // 'soccer' | 'ufc' | 'nba'
  name: string;
  outcome_kind: OutcomeKind;
  tier: Tier;
}

export interface League {
  id: string;
  sport_id: string;
  name: string;
}

export interface Competitor {
  id: string;
  league_id: string;
  name: string;
}

export interface Match {
  id: string;
  league_id: string;
  home_id: string;
  away_id: string;
  external_id: string | null;
  starts_at: string;
  status: string;
  result: Record<string, unknown> | null;
  market_odds: Record<string, unknown> | null;
}

export interface Features {
  match_id: string;
  data: Record<string, number | null>;
}

export interface Prediction {
  id: string;
  match_id: string;
  tier: Tier;
  model_version: string;
  probs: Record<string, number>; // {"home":0.62,"away":0.38} or 3-way
  analysis: string | null;
  analysis_version: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  plan: Plan;
  stripe_customer_id: string | null;
}

export interface Favorite {
  user_id: string;
  match_id: string;
}

export interface FollowedCompetitor {
  user_id: string;
  competitor_id: string;
  created_at: string;
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
};

export interface Database {
  public: {
    Tables: {
      sports: Table<Sport>;
      leagues: Table<League>;
      competitors: Table<Competitor>;
      matches: Table<Match>;
      features: Table<Features>;
      predictions: Table<Prediction>;
      profiles: Table<Profile>;
      favorites: Table<Favorite>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      outcome_type: OutcomeKind;
    };
  };
}
