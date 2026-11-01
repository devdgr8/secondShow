// Fixed tilt per position, like letters slid onto the rail by hand.
const TILT = [-1.4, 0.8, -0.5, 1.2, 0.3, -1, 0.6, -0.2, 1.5, -0.8];

function Rail({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <div className={accent ? "rail rail-accent" : "rail"} aria-hidden="true">
      {text
        .toUpperCase()
        .split(" ")
        .map((word, wordIndex) => (
          <span key={wordIndex} className="rail-word">
            {[...word].map((letter, index) => (
              <span key={index} style={{ rotate: `${TILT[(wordIndex + index) % TILT.length]}deg` }}>
                {letter}
              </span>
            ))}
          </span>
        ))}
    </div>
  );
}

export function Marquee({ lead, title, foot }: { lead: string; title: string; foot: string }) {
  return (
    <section className="marquee" aria-label={`${lead}: ${title}. ${foot}`}>
      <div className="marquee-board">
        <Rail text={lead} />
        <Rail text={title.length > 34 ? `${title.slice(0, 33).trimEnd()}…` : title} accent />
        <Rail text={foot} />
      </div>
    </section>
  );
}
