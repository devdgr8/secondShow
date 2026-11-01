import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Theater } from "@/components/Theater";
import { isAdmin } from "@/lib/auth";
import { getFilm } from "@/lib/catalog";
import { runtime } from "@/lib/format";
import { LICENSES } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const film = await getFilm((await params).id);
  return film?.status === "live"
    ? { title: film.title, description: film.synopsis || undefined }
    : { title: "Not found" };
}

export default async function FilmPage({ params }: Props) {
  const film = await getFilm((await params).id);
  if (!film || (film.status !== "live" && !(await isAdmin()))) notFound();

  return (
    <main className="film-page">
      <Theater id={film.id} title={film.title} poster={film.hasPoster} />
      <section className="film-notes">
        <div>
          {film.status !== "live" && <p className="pending-flag">Waiting for review</p>}
          <h1>{film.title}</h1>
          <p className="eyebrow">
            {[film.genre, film.year, runtime(film.runtimeSec)].filter(Boolean).join(" · ")}
          </p>
          {film.director && <p className="byline">Directed by {film.director}</p>}
          {film.synopsis && <p className="synopsis">{film.synopsis}</p>}
        </div>
        <aside className={`stub stub-tall stub-${film.license}`}>
          <small>Admit one · Free</small>
          <strong>{LICENSES[film.license]}</strong>
          {film.sourceUrl && (
            <a href={film.sourceUrl} rel="noopener nofollow ugc" target="_blank">
              Source
            </a>
          )}
          {film.submittedBy && <span>Submitted by {film.submittedBy}</span>}
          <Link href={`/takedown?film=${film.id}`}>Report this film</Link>
        </aside>
      </section>
    </main>
  );
}
