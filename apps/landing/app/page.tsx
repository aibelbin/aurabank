import { GuillocheField } from "@/components/canvas/GuillocheField";
import { Disclosure } from "@/components/sections/Disclosure";
import { Hero } from "@/components/sections/Hero";
import { OpenAccount } from "@/components/sections/OpenAccount";
import { SiteFooter } from "@/components/sections/SiteFooter";
import { StoryScrub } from "@/components/sections/StoryScrub";

export default function Home() {
  return (
    <>
      {/* Engraving sits above the page background and below every word. */}
      <GuillocheField />
      <main className="relative z-10">
        <Hero />
        <StoryScrub />
        <Disclosure />
        <OpenAccount />
        <SiteFooter />
      </main>
    </>
  );
}
