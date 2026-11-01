const SPOKES = [0, 60, 120, 180, 240, 300];

function Reel({ cx, wound, spinning }: { cx: number; wound: number; spinning: boolean }) {
  const radius = 22 + wound * 56;
  return (
    <g>
      <circle cx={cx} cy="92" r="84" className="reel-flange" />
      <circle cx={cx} cy="92" r={radius} className="reel-film" />
      <g className={spinning ? "reel-spin" : undefined} style={{ transformOrigin: `${cx}px 92px` }}>
        {SPOKES.map((angle) => (
          <circle
            key={angle}
            cx={cx}
            cy="46"
            r="10"
            className="reel-hole"
            transform={`rotate(${angle} ${cx} 92)`}
          />
        ))}
        <circle cx={cx} cy="92" r="16" className="reel-hub" />
      </g>
    </g>
  );
}

/** Film winds from the supply reel on the left to the take-up reel on the right. */
export function Reels({ progress, spinning }: { progress: number; spinning: boolean }) {
  return (
    <svg className="reels" viewBox="0 0 460 190" role="presentation">
      <path d="M 96 176 L 230 186 L 364 176" className="reel-path" />
      <Reel cx={96} wound={1 - progress} spinning={spinning} />
      <Reel cx={364} wound={progress} spinning={spinning} />
    </svg>
  );
}
