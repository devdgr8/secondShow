import Link from "next/link";
import { FilmGrid } from "@/components/FilmGrid";
import { Marquee } from "@/components/Marquee";
import { Poster } from "@/components/Poster";
import { getCatalog } from "@/lib/catalog";
import { runtime } from "@/lib/format";
import { LICENSES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { films } = await getCatalog();
  const live = films.filter((film) => film.status === "live");
  const [tonight] = live;

  return (
    <main>
      <Marquee
        lead={tonight ? "Tonight" : "Coming soon"}
        title={tonight ? tonight.title : "First show"}
        foot="Free admission"
      />

      {tonight ? (
        <section className="tonight" id={live.length > 1 ? undefined : "now-showing"}>
          <Link href={`/film/${tonight.id}`} className="tonight-poster" aria-label={`Watch ${tonight.title}`}>
            <Poster film={tonight} />
          </Link>
          <div>
            <p className="eyebrow">
              {[tonight.genre, tonight.year, runtime(tonight.runtimeSec)].filter(Boolean).join(" · ")}
            </p>
            <h1>{tonight.title}</h1>
            {tonight.director && <p className="byline">Directed by {tonight.director}</p>}
            {tonight.synopsis && <p className="synopsis">{tonight.synopsis}</p>}
            <p className="licence-line">{LICENSES[tonight.license]}</p>
            <Link href={`/film/${tonight.id}`} className="button">
              Take your seat
            </Link>
          </div>
        </section>
      ) : (
        <section className="house-dark">
          <h1>The house is dark.</h1>
          <p>The projector is warming up. The first film goes on this board.</p>
        </section>
      )}

      {live.length > 1 && (
        <section id="now-showing" className="section">
          <h2>Now showing</h2>
          <FilmGrid films={live} />
        </section>
      )}

      <section className="pitch">
        <div>
          <h2>Got a film nobody has seen?</h2>
          <p>
            If you made it, hold the rights, or it is in the public domain, it can play here. Free
            to submit and free to watch.
          </p>
        </div>
        <Link href="/submit" className="button">
          Submit a film
        </Link>
      </section>
    </main>
  );
}
