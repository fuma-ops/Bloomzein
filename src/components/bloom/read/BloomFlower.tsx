/**
 * The Bloomzein logo flower (6 petals + center), as a single-colour SVG that
 * inherits `currentColor`. Used as a soft, faded, breathing watermark in the
 * empty spaces of an article.
 */
export function BloomFlower({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 512 512" className={className} style={style} fill="currentColor" aria-hidden="true">
      <g>
        <ellipse cx="256" cy="161" rx="48" ry="95" />
        <ellipse cx="256" cy="161" rx="48" ry="95" transform="rotate(60 256 256)" />
        <ellipse cx="256" cy="161" rx="48" ry="95" transform="rotate(120 256 256)" />
        <ellipse cx="256" cy="161" rx="48" ry="95" transform="rotate(180 256 256)" />
        <ellipse cx="256" cy="161" rx="48" ry="95" transform="rotate(240 256 256)" />
        <ellipse cx="256" cy="161" rx="48" ry="95" transform="rotate(300 256 256)" />
      </g>
      <circle cx="256" cy="256" r="44" fill="#fff" opacity="0.55" />
    </svg>
  );
}

export default BloomFlower;
