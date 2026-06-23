import { LegalDoc, Section } from "@/components/LegalDoc";
import { COMPANY_NAME, PRIVACY_UPDATED, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata = { title: "Privacy Policy" };

// STARTER TEMPLATE — not legal advice. Have a lawyer review before launch.
export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy" updated={PRIVACY_UPDATED}>
      <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300/80">
        Template for review. Confirm this matches what you actually collect, and have a qualified
        attorney review it before {COMPANY_NAME} accepts payment.
      </p>

      <p>
        This Privacy Policy explains what {COMPANY_NAME} (&ldquo;we&rdquo;) collects, why, and your
        choices. By using the Service you agree to this policy.
      </p>

      <Section heading="1. What we collect">
        <p>
          <span className="text-[#e4e7f0]">Account data:</span> your email address and authentication
          credentials, managed by our authentication provider (Supabase).
        </p>
        <p>
          <span className="text-[#e4e7f0]">Usage data:</span> the teams and fighters you follow, your
          plan tier, and basic activity needed to run the Service.
        </p>
        <p>
          <span className="text-[#e4e7f0]">Payment data:</span> when you subscribe, our payment
          processor (Stripe) handles your card details. We never see or store full card numbers — we
          receive only a customer reference and subscription status.
        </p>
      </Section>

      <Section heading="2. How we use it">
        <p>
          To create and secure your account, provide predictions and your personalized feed, process
          subscriptions, respond to support requests, and keep the Service working and safe.
        </p>
      </Section>

      <Section heading="3. How we share it">
        <p>
          We do not sell your personal data. We share it only with the service providers that run the
          product on our behalf — our hosting/database provider (Supabase), our payment processor
          (Stripe), and similar infrastructure — and only as needed to operate the Service, or when
          required by law.
        </p>
      </Section>

      <Section heading="4. Cookies">
        <p>
          We use essential cookies to keep you signed in. We do not use them to build advertising
          profiles.
        </p>
      </Section>

      <Section heading="5. Data retention">
        <p>
          We keep your data while your account is active. You can ask us to delete your account and
          associated personal data at any time, subject to records we must keep for legal or billing
          reasons.
        </p>
      </Section>

      <Section heading="6. Your rights">
        <p>
          Depending on where you live, you may have the right to access, correct, export, or delete
          your personal data. To exercise these rights, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section heading="7. Children">
        <p>
          The Service is not directed to anyone under 18, and we do not knowingly collect data from
          them.
        </p>
      </Section>

      <Section heading="8. Changes and contact">
        <p>
          We may update this policy; material changes will be posted here with a new date. Questions?
          Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalDoc>
  );
}
