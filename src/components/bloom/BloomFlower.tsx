/* BloomFlower — the brand's 6-petal flower (from the app logo), on its own so
   it can sit inside medallions, badges and the level-up celebration. White
   petals + soft-pink center by default, sized to taste. */
export function BloomFlower({
  size = 24,
  petal = "#FFFFFF",
  center = "#FFD9EC",
  className,
  style,
}: {
  size?: number;
  petal?: string;
  center?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className} style={style} aria-hidden="true">
      <g>
        <ellipse cx="256" cy="161" rx="48" ry="95" fill={petal} />
        <ellipse cx="256" cy="161" rx="48" ry="95" fill={petal} transform="rotate(60 256 256)" />
        <ellipse cx="256" cy="161" rx="48" ry="95" fill={petal} transform="rotate(120 256 256)" />
        <ellipse cx="256" cy="161" rx="48" ry="95" fill={petal} transform="rotate(180 256 256)" />
        <ellipse cx="256" cy="161" rx="48" ry="95" fill={petal} transform="rotate(240 256 256)" />
        <ellipse cx="256" cy="161" rx="48" ry="95" fill={petal} transform="rotate(300 256 256)" />
        <circle cx="256" cy="256" r="44" fill={center} />
      </g>
    </svg>
  );
}
