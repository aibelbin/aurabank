/**
 * The shared design system: ink-on-paper tokens, typography primitives, and the
 * motion they depend on.
 *
 * Everything here is presentational leaf code — no data access, no domain
 * rules, no knowledge of any app. That is what makes it safe to share: an app
 * can change how aura settles without touching a line of it.
 */
export { cn } from "./cn";

export { MonoLabel } from "./ui/MonoLabel";
export { Button, buttonClass } from "./ui/Button";
export type { ButtonTone } from "./ui/Button";
export { Field, fieldControlClass } from "./ui/Field";
export { SpriteSheet } from "./ui/SpriteSheet";
export { Stamp } from "./ui/Stamp";
export { Status } from "./ui/Status";
export type { StatusTone } from "./ui/Status";
export { Rule } from "./ui/Rule";
export { Figure } from "./ui/Figure";
export { Amount } from "./ui/Amount";
export type { AmountTone } from "./ui/Amount";
export { Mantra } from "./ui/Mantra";
export { Section } from "./ui/Section";
export { SectionHead } from "./ui/SectionHead";

export { SplitHeadline } from "./motion/SplitHeadline";
export { splitText, countChars } from "./motion/split-text";
export type { SplitChar, SplitWord, SplitLine } from "./motion/split-text";
export { useInView } from "./motion/use-in-view";
export { useReducedMotion, prefersReducedMotion } from "./motion/use-reduced-motion";
