/** Splits text into words and fades each one in, staggered — for headlines & insight copy that should feel freshly generated. */
export function AnimatedWords({ text, className = "", delay = 0, step = 60 }: { text: string; className?: string; delay?: number; step?: number }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span
          key={`${word}-${i}`}
          className={`animate-fade-in inline-block ${className}`}
          style={{ animationDelay: `${delay + i * step}ms` }}
        >
          {word}&nbsp;
        </span>
      ))}
    </>
  );
}
