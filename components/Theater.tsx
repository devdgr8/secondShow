"use client";

import { useEffect, useState } from "react";
import { fileUrl, posterUrl } from "@/lib/archive-urls";

export function Theater({ id, title, files }: { id: string; title: string; files: string[] }) {
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
            poster={posterUrl(id)}
            aria-label={title}
            onPlay={() => setDimmed(true)}
          >
            {/* The browser moves to the next source by itself, so only the last failure counts. */}
            {files.map((file, index) => (
              <source
                key={file}
                src={fileUrl(id, file)}
                onError={index === files.length - 1 ? () => setFailed(true) : undefined}
              />
            ))}
          </video>
        )}
      </div>
      <button className="lights" aria-pressed={dimmed} onClick={() => setDimmed(!dimmed)}>
        {dimmed ? "Raise the house lights" : "Dim the house lights"}
      </button>
    </div>
  );
}
