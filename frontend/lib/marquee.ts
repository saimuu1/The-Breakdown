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

/** Lowercase, accent-insensitive key (NFKD + drop non-ASCII) so curated names
   match ESPN's spellings regardless of diacritics. */
function normalize(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .toLowerCase()
    .trim();
}

/** A bout is spotlight-worthy if either fighter is a marquee name. */
export function isMarqueeFight(p: PredictionView): boolean {
  return (
    MARQUEE_FIGHTERS.has(normalize(p.match.home.name)) ||
    MARQUEE_FIGHTERS.has(normalize(p.match.away.name))
  );
}
