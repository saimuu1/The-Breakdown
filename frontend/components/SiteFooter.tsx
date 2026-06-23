import Link from "next/link";

import { COMPANY_NAME, MIN_AGE, SUPPORT_EMAIL } from "@/lib/legal";

/** Shared footer for the app pages: legal links + the standing disclaimer.
   Landing page keeps its own richer footer. */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/[0.05]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#5a607a]">
          <Link href="/terms" className="transition-colors duration-150 hover:text-[#b0b8d0]">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors duration-150 hover:text-[#b0b8d0]">
            Privacy
          </Link>
          <Link
            href="/responsible-gaming"
            className="transition-colors duration-150 hover:text-[#b0b8d0]"
          >
            Responsible gaming
          </Link>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="transition-colors duration-150 hover:text-[#b0b8d0]"
          >
            Support
          </a>
          <span className="ml-auto text-[#3a3e55]">
            {COMPANY_NAME} · {MIN_AGE}+
          </span>
        </nav>
        <p className="mt-4 text-xs leading-relaxed text-[#3a3e55]">
          For informational and entertainment purposes only — not betting, investment, or
          financial advice. No outcome is guaranteed. If gambling is a problem for you, call
          1-800-GAMBLER.
        </p>
      </div>
    </footer>
  );
}
