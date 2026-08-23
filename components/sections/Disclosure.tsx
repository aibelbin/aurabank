import { Figure } from "@/components/ui/Figure";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Section } from "@/components/ui/Section";
import { SplitHeadline } from "@/components/motion/SplitHeadline";

export function Disclosure() {
  return (
    <Section id="disclosure" number="03" label="Full disclosure">
      <SplitHeadline
        as="h2"
        text={"Aura is zero-sum.\nYour gain is someone's loss.\nThere is no aura printer."}
        className="max-w-[26ch] text-[clamp(1.875rem,5.6vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.035em]"
      />

      <div className="mt-14 grid gap-12 md:mt-20 md:grid-cols-2 md:gap-20">
        <div className="max-w-[48ch] space-y-5 text-lg leading-[1.55] text-ink/80">
          <p>
            We do not issue aura. We hold no reserves. We move what already exists, between the
            people who earned and lost it.
          </p>
          <p>
            A balance can go below zero. We call this aura debt. It accrues, it is visible to
            everyone, and there is no bankruptcy protection.
          </p>
        </div>

        {/* The ledger, stated plainly. Accent colour appears only on figures. */}
        <dl className="divide-y divide-hairline border-y border-hairline">
          <div className="flex items-baseline justify-between gap-6 py-4">
            <dt>
              <MonoLabel muted>Aura issued by AuraBank</MonoLabel>
            </dt>
            <dd className="font-mono text-xl">
              <Figure value={0} tone="settle" />
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-6 py-4">
            <dt>
              <MonoLabel muted>Reserves held</MonoLabel>
            </dt>
            <dd className="font-mono text-xl">
              <Figure value={0} tone="settle" />
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-6 py-5">
            <dt>
              <MonoLabel muted>Specimen balance — in arrears</MonoLabel>
            </dt>
            <dd className="font-mono text-2xl md:text-3xl">
              <Figure value={1240} prefix="−" tone="debt" />
            </dd>
          </div>
        </dl>
      </div>
    </Section>
  );
}
