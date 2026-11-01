"use client";

import { useEffect, useState } from "react";

export function Theater({ id, title, poster }: { id: string; title: string; poster: boolean }) {
  const [dimmed, setDimmed] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("lights-down", dimmed);
    return () => document.body.classList.remove("lights-down");
  }, [dimmed]);

  return (
    <div className="theater">
      <div className="screen">
        {failed ? (
          <p className="screen-error">This reel would not load. Refresh the page to try again.</p>
        ) : (
          <video
            controls
            playsInline
            preload="metadata"
            poster={poster ? `/api/film/${id}/poster` : undefined}
            aria-label={title}
            src={`/api/film/${id}/stream`}
            onPlay={() => setDimmed(true)}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <button className="lights" aria-pressed={dimmed} onClick={() => setDimmed(!dimmed)}>
        {dimmed ? "Raise the house lights" : "Dim the house lights"}
      </button>
    </div>
  );
}
