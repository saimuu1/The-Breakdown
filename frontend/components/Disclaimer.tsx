import Link from "next/link";

import { MIN_AGE } from "@/lib/legal";

/** The standing "this is information, not betting advice" notice. Reused
   everywhere picks appear so the wording is consistent and unmissable — the
   load-bearing line for both processor compliance and liability. */
export function Disclaimer({ variant = "inline" }: { variant?: "inline" | "card" }) {
  const body = (
    <>
      Predictions and analysis are for informational and entertainment purposes only —
      not betting, investment, or financial advice. No outcome is guaranteed. You are
      solely responsible for your own decisions. {MIN_AGE}+ only. If gambling is a
      problem for you, call 1-800-GAMBLER or visit{" "}
      <a
        href="https://www.ncpgambling.org"
        target="_blank"
        rel="noopener noreferrer"
        className="underline transition-colors duration-150 hover:text-[#b0b8d0]"
      >
        ncpgambling.org
      </a>
      . See our{" "}
      <Link href="/terms" className="underline transition-colors duration-150 hover:text-[#b0b8d0]">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="underline transition-colors duration-150 hover:text-[#b0b8d0]">
        Privacy Policy
      </Link>
      .
    </>
  );

  if (variant === "card") {
    return (
      <div className="rounded-xl border border-[#1e2236] bg-[#0c0f1a] p-4 text-xs leading-relaxed text-[#5a607a]">
        {body}
      </div>
    );
  }
  return <p className="text-xs leading-relaxed text-[#3a3e55]">{body}</p>;
}
