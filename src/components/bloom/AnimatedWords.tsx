import { useMemo } from "react";

/**
 * AnimatedWords — fades a string in one word at a time (left to right).
 * Used for greetings, phase names, and "today's insight" text.
 *
 * Requires bloom-motion.css (provides `.animate-word-fade` + the
 * `bloom-word-fade` keyframe). Honors prefers-reduced-motion automatically.
 *
 * Usage:
 *   <AnimatedWords text={`Good morning, ${name}`} className="font-script text-5xl text-hotpink" />
 *   <AnimatedWords text="Radiant phase" stagger={120} />
 */
interface AnimatedWordsProps {
  text: string;
  /** ms between each word. Default 200. */
  stagger?: number;
  /** ms before the first word starts. Default 0. */
  initialDelay?: number;
  /** classes applied to the wrapper (font, size, color, etc.) */
  className?: string;
  /** @deprecated use stagger */
  step?: number;
  /** @deprecated use initialDelay */
  delay?: number;
}

export function AnimatedWords({
  text,
  stagger,
  initialDelay,
  className = "",
  step,
  delay,
}: AnimatedWordsProps) {
  const resolvedStagger = stagger ?? step ?? 200;
  const resolvedDelay = initialDelay ?? delay ?? 0;
  const words = useMemo(() => text.split(" "), [text]);

  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden="true"
          className="animate-word-fade inline-block"
          style={{ animationDelay: `${resolvedDelay + i * resolvedStagger}ms`, marginRight: "0.25em" }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
