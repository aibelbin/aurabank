import { MonoLabel, SplitHeadline } from "@aurabank/design";

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] flex-col justify-between px-6 pt-8 pb-10 md:px-12 md:pt-10 md:pb-12"
    >
      {/* The letterhead, signed. The wordmark is not repeated here — it is
          already the headline below, at three hundred times the size. The
          sentiment carries the ink and the name is set quietly beside it,
          which is the same weighting the page uses everywhere else. */}
      <div className="flex items-baseline justify-between gap-6">
        <MonoLabel>With lots of sigma aura</MonoLabel>
        <MonoLabel muted className="text-right">
          Aibel Bin Zacariah
        </MonoLabel>
      </div>

      <div className="mx-auto w-full max-w-[72rem]">
        <SplitHeadline
          as="h1"
          text="AURABANK"
          className="text-[clamp(3.25rem,13.5vw,12.5rem)] leading-[0.84] font-semibold tracking-[-0.05em]"
        />

        <div className="mt-10 grid gap-x-12 gap-y-6 border-t border-hairline pt-8 md:mt-14 md:grid-cols-2">
          <p className="text-[clamp(1.5rem,3.4vw,2.5rem)] leading-[1.08] font-medium tracking-[-0.02em]">
            The central bank of aura.
          </p>
          <p className="max-w-[34ch] font-mono text-sm leading-relaxed text-ink/60 md:justify-self-end">
            Aura Mukhyam
          </p>
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <MonoLabel muted>Scroll to review terms</MonoLabel>
        <MonoLabel muted aria-hidden="true">
          ↓
        </MonoLabel>
      </div>
    </section>
  );
}
