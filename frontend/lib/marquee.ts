import type { PredictionView } from "@/lib/queries";

/** Marquee fighters — champions, megastars (10M+ followers), and famous
   undefeated names. A bout involving any of them is "spotlight"-worthy and gets
   pinned to the top of the upcoming board. Curated because the signal we care
   about (star power / belts / hype) isn't in the stats feed. */
const MARQUEE_FIGHTERS = new Set(
  [
    "Conor McGregor",
    "Islam Makhachev",
    "Jon Jones",
    "Israel Adesanya",
    "Alex Pereira",
    "Sean O'Malley",
    "Ilia Topuria",
    "Max Holloway",
    "Justin Gaethje",
    "Dustin Poirier",
    "Charles Oliveira",
    "Alexander Volkanovski",
    "Khamzat Chimaev",
    "Paddy Pimblett",
    "Michael Chandler",
    "Tom Aspinall",
    "Jiri Prochazka",
    "Sean Strickland",
    "Robert Whittaker",
    "Kamaru Usman",
    "Colby Covington",
    "Leon Edwards",
    "Belal Muhammad",
    "Dricus Du Plessis",
    "Merab Dvalishvili",
    "Arman Tsarukyan",
    "Umar Nurmagomedov",
    "Movsar Evloev",
    "Shara Magomedov",
    "Bo Nickal",
    "Ian Machado Garry",
    "Brandon Moreno",
    "Alexandre Pantoja",
    "Ciryl Gane",
    "Jamahal Hill",
    "Diego Lopes",
  ].map(normalize),
);

/** Top-10 national teams. A World Cup match between TWO of them is a heavyweight
   clash — highlighted in place (not pinned), so it stands out on its matchday. */
const TOP_TEN_TEAMS = new Set(
  [
    "Argentina",
    "France",
    "Spain",
    "England",
    "Brazil",
    "Portugal",
    "Netherlands",
    "Germany",
    "Belgium",
    "Italy",
  ].map(normalize),
);

/** Lowercase, accent-insensitive key (NFKD + drop non-ASCII) so curated names
   match ESPN's spellings regardless of diacritics. */
function normalize(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .toLowerCase()
    .trim();
}

/** Spotlight-worthy (pinned to the top) — UFC only: a marquee fighter is in it. */
export function isMarqueeFight(p: PredictionView): boolean {
  if (p.match.league.sport_id !== "ufc") return false;
  return (
    MARQUEE_FIGHTERS.has(normalize(p.match.home.name)) ||
    MARQUEE_FIGHTERS.has(normalize(p.match.away.name))
  );
}

/** A soccer match between two top-10 sides — gets a standout accent in place. */
export function isTopTenClash(p: PredictionView): boolean {
  if (p.match.league.sport_id !== "soccer") return false;
  return (
    TOP_TEN_TEAMS.has(normalize(p.match.home.name)) &&
    TOP_TEN_TEAMS.has(normalize(p.match.away.name))
  );
}
