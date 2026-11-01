"use client";

import Link from "next/link";
import { useState } from "react";
import { runtime } from "@/lib/format";
import { LICENSES, type Film } from "@/lib/types";
import { Poster } from "./Poster";

export function FilmGrid({ films }: { films: Film[] }) {
  const [genre, setGenre] = useState("All");
  const genres = ["All", ...new Set(films.map((film) => film.genre))];
  const shown = genre === "All" ? films : films.filter((film) => film.genre === genre);

  return (
    <>
      {genres.length > 2 && (
        <div className="filters" role="group" aria-label="Filter by genre">
          {genres.map((name) => (
            <button key={name} aria-pressed={name === genre} onClick={() => setGenre(name)}>
              {name}
            </button>
          ))}
        </div>
      )}
      <ul className="film-grid">
        {shown.map((film) => (
          <li key={film.id}>
            <Link href={`/film/${film.id}`} className="film-card">
              <Poster film={film} />
              <div className={`stub stub-${film.license}`}>
                <strong>{film.title}</strong>
                <span>{[film.year, runtime(film.runtimeSec)].filter(Boolean).join(" · ")}</span>
                <small>{LICENSES[film.license]}</small>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
