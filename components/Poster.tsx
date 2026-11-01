import type { Film } from "@/lib/types";

const INKS = ["#a3271b", "#14564f", "#20345f", "#7a4a12", "#5b2350"];

/** Films without artwork get a block-printed title card. */
export function Poster({ film }: { film: Film }) {
  if (film.hasPoster) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="poster" src={`/api/film/${film.id}/poster`} alt="" loading="lazy" />;
  }
  const ink = INKS[parseInt(film.id.slice(0, 4), 16) % INKS.length];
  return (
    <div className="poster poster-card" style={{ background: ink }} aria-hidden="true">
      <span>{film.title}</span>
    </div>
  );
}
