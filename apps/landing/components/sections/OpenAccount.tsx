import { Mantra, Section, SplitHeadline } from "@aurabank/design";
import { WaitlistForm } from "./WaitlistForm";

export function OpenAccount() {
  return (
    <Section id="open-an-account" number="04" label="Open an account">
      <SplitHeadline
        as="h2"
        text={"AuraBank is not yet\naccepting deposits."}
        className="max-w-[24ch] text-[clamp(1.875rem,5.6vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.035em]"
      />

      <p className="mt-10 max-w-[46ch] text-lg leading-[1.55] text-ink/80">
        Join the waitlist. Accounts open in order of application.
      </p>

      <div className="mt-14 md:mt-20">
        <WaitlistForm />
      </div>

      <Mantra className="mt-20" />
    </Section>
  );
}
