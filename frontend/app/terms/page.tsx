import { LegalDoc, Section } from "@/components/LegalDoc";
import { COMPANY_NAME, MIN_AGE, SUPPORT_EMAIL, TERMS_UPDATED } from "@/lib/legal";

export const metadata = { title: "Terms of Service" };

// STARTER TEMPLATE — not legal advice. Have a lawyer review before launch.
export default function TermsPage() {
  return (
    <LegalDoc title="Terms of Service" updated={TERMS_UPDATED}>
      <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300/80">
        Template for review. These terms are a starting point and should be reviewed by a
        qualified attorney before {COMPANY_NAME} accepts payment.
      </p>

      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of {COMPANY_NAME}
        (the &ldquo;Service&rdquo;). By creating an account or using the Service, you agree to these
        Terms. If you do not agree, do not use the Service.
      </p>

      <Section heading="1. Eligibility">
        <p>
          You must be at least {MIN_AGE} years old (or the age of majority in your jurisdiction,
          whichever is greater) to use the Service. By using it, you represent that you meet this
          requirement and that your use is lawful where you live.
        </p>
      </Section>

      <Section heading="2. The Service is information, not advice">
        <p>
          {COMPANY_NAME} provides statistical predictions, model outputs, and written analysis about
          sporting events for informational and entertainment purposes only. Nothing on the Service
          is betting, gambling, investment, tax, or financial advice, and nothing is a
          recommendation to place any wager. Predictions are probabilistic and frequently wrong. No
          result is guaranteed.
        </p>
        <p>
          {COMPANY_NAME} does not accept, place, broker, or settle bets, and does not receive any
          share of any wager. We are not a sportsbook or gambling operator.
        </p>
      </Section>

      <Section heading="3. Your responsibility">
        <p>
          Any decision you make — including any decision to wager money with a third party — is
          yours alone and made at your own risk. You agree that {COMPANY_NAME} is not responsible for
          any losses, damages, or consequences arising from your use of the predictions or analysis.
        </p>
      </Section>

      <Section heading="4. Accounts">
        <p>
          You are responsible for safeguarding your account credentials and for all activity under
          your account. Provide accurate information and keep it current. Notify us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          of any unauthorized use.
        </p>
      </Section>

      <Section heading="5. Subscriptions and billing">
        <p>
          Paid plans are billed in advance on a recurring basis through our payment processor. Your
          subscription renews automatically until cancelled. You may cancel at any time; cancellation
          takes effect at the end of the current billing period, and you retain access until then.
          Except where required by law, payments are non-refundable. Prices may change with notice.
        </p>
      </Section>

      <Section heading="6. Acceptable use">
        <p>
          Do not misuse the Service: no scraping or bulk extraction of predictions, no reselling or
          redistributing content, no attempts to bypass tier or access controls, and no unlawful use.
          We may suspend or terminate accounts that violate these Terms.
        </p>
      </Section>

      <Section heading="7. Intellectual property">
        <p>
          The Service, including model outputs and written analysis, is owned by {COMPANY_NAME} and
          protected by applicable law. We grant you a limited, personal, non-transferable license to
          use the Service for your own non-commercial use.
        </p>
      </Section>

      <Section heading="8. Disclaimers and limitation of liability">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
          warranties of any kind, express or implied, including accuracy, fitness for a particular
          purpose, or uninterrupted availability. To the maximum extent permitted by law,{" "}
          {COMPANY_NAME} will not be liable for any indirect, incidental, or consequential damages,
          or for any lost wagers, profits, or data, arising from your use of the Service. Our total
          liability for any claim is limited to the amount you paid us in the twelve months before
          the claim.
        </p>
      </Section>

      <Section heading="9. Changes">
        <p>
          We may update these Terms from time to time. Material changes will be posted here with a
          new &ldquo;last updated&rdquo; date. Continued use after changes means you accept them.
        </p>
      </Section>

      <Section heading="10. Contact">
        <p>
          Questions about these Terms? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalDoc>
  );
}
