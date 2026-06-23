import { LegalDoc, Section } from "@/components/LegalDoc";
import { COMPANY_NAME, MIN_AGE } from "@/lib/legal";

export const metadata = { title: "Responsible gaming" };

export default function ResponsibleGamingPage() {
  return (
    <LegalDoc title="Responsible gaming">
      <p>
        {COMPANY_NAME} is an information and entertainment product. We publish predictions and
        analysis — we are not a sportsbook, we do not take bets, and nothing here is a recommendation
        to gamble. If you choose to wager with a third party, please do so responsibly.
      </p>

      <Section heading="Stay in control">
        <ul className="list-disc space-y-1 pl-5">
          <li>Only ever risk money you can afford to lose.</li>
          <li>Set limits on time and money before you start, and stick to them.</li>
          <li>Never chase losses, and never gamble to make money or escape stress.</li>
          <li>You must be {MIN_AGE}+ (or older where your jurisdiction requires) to use this Service.</li>
        </ul>
      </Section>

      <Section heading="If it stops being fun">
        <p>Free, confidential help is available 24/7:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Call or text <span className="text-[#e4e7f0]">1-800-GAMBLER</span>.
          </li>
          <li>
            National Council on Problem Gambling —{" "}
            <a
              href="https://www.ncpgambling.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              ncpgambling.org
            </a>
            .
          </li>
        </ul>
      </Section>
    </LegalDoc>
  );
}
