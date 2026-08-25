/**
 * The primary action, pinned within thumb reach.
 *
 * Never a button in the top-right corner: on the phone this app is designed
 * for, the top-right corner is the hardest place on the screen to reach, and
 * the one action a document wants from you is the one that should be easiest.
 */
export function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-paper">
      <div className="mx-auto w-full max-w-[46rem] px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-10">
        {children}
      </div>
    </div>
  );
}
