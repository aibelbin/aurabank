import { MonoLabel, Section, SpriteSheet, SplitHeadline } from "@aurabank/design";
import { DUEL_SHEET } from "@/lib/story/duel";

export function Disclosure() {
  return (
    <Section id="disclosure" number="03" label="Nature of business">
      <SplitHeadline
        as="h2"
        text={"This is AuraBank.\nA bank that holds\nand stores your aura."}
        className="max-w-[26ch] text-[clamp(1.875rem,5.6vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.035em]"
      />

      <div className="mt-12 grid gap-8 text-lg leading-[1.55] text-ink/80 md:mt-16 md:grid-cols-2 md:gap-16">
        <p className="max-w-[46ch]">
          Your aura is a number here, not an argument. A sigma moment credits it. A roast, or any
          other aura-minus evidence, debits it.
        </p>
        <p className="max-w-[46ch]">
          Nothing moves on a say-so. A claim is filed with evidence, the respondent replies, and a
          judge rules. Only then does the balance change — and it may go below zero. We call that
          aura debt.
        </p>
      </div>

      {/* A specimen settlement, across the full measure.
          This is where the ledger figures used to sit. The picture makes the
          same point they did and makes it faster: five units leave one party
          and exactly five reach the other. Nothing is issued, and the fight
          that caused it decides nothing on its own. */}
      <figure className="mt-14 md:mt-20">
        {/* Full-bleed on a phone, where the column measure would squeeze a
            2.3:1 band into a letterbox. The bleed is a wrapper rather than a
            width override on the primitive: two `width` utilities on one
            element are settled by stylesheet order, which is not a thing to
            depend on. The caption stays on the measure. */}
        <div className="-mx-6 md:mx-0">
          <SpriteSheet
            src={DUEL_SHEET.src}
            srcSmall={DUEL_SHEET.srcSmall}
            columns={DUEL_SHEET.columns}
            rows={DUEL_SHEET.rows}
            frameWidth={DUEL_SHEET.frameWidth}
            frameHeight={DUEL_SHEET.frameHeight}
            durationMs={DUEL_SHEET.durationMs}
            alt="Two members fight with swords. One somersaults over the other and drives them across the floor, and five units of aura cross from the loser to the winner."
          />
        </div>
        <figcaption className="mt-4 border-t border-hairline pt-4">
          <MonoLabel muted>
            We are cooking a fun court room setup to deal with aura cases :)
          </MonoLabel>
        </figcaption>
      </figure>
    </Section>
  );
}
