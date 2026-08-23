import { MonoLabel } from "@/components/ui/MonoLabel";
import { Rule } from "@/components/ui/Rule";

export function SiteFooter() {
  return (
    <footer className="relative">
      <Rule />
      <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-8 px-6 py-14 md:flex-row md:items-end md:justify-between md:px-12">
        <p className="max-w-[52ch] font-mono text-[0.6875rem] leading-relaxed tracking-[0.06em] text-ink/45 uppercase">
          AuraBank is not a bank. Not FDIC insured. Not insured in any way. Aura balances have no
          cash value and never will.
        </p>
        <MonoLabel muted>AuraBank — Established 2026</MonoLabel>
      </div>
    </footer>
  );
}
