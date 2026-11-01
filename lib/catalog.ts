import { randomBytes } from "node:crypto";
import { revalidateTag, unstable_cache } from "next/cache";
import { isStorageConfigured } from "./config";
import { readAll, remove, writeJson } from "./store";
import { GENRES, LICENSES, type Film, type FilmDetails, type License, type Report } from "./types";

const FILMS = "catalog-films";
const REPORTS = "catalog-reports";
const DAY = 60 * 60 * 24;

// Blob's free plan allows few list calls a month, so results stay cached until something changes.
const cachedFilms = unstable_cache(() => readAll<Film>("films/"), [FILMS], {
  tags: [FILMS],
  revalidate: DAY,
});
const cachedReports = unstable_cache(() => readAll<Report>("reports/"), [REPORTS], {
  tags: [REPORTS],
  revalidate: DAY,
});

export async function getFilms() {
  if (!isStorageConfigured()) return [] as Film[];
  const films = await cachedFilms();
  return [...films].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const getFilm = async (id: string) => (await getFilms()).find((film) => film.id === id);

export async function saveFilm(film: Film) {
  await writeJson(`films/${film.id}.json`, film);
  revalidateTag(FILMS, { expire: 0 });
}

export async function deleteFilm(id: string) {
  await remove(`films/${id}.json`);
  revalidateTag(FILMS, { expire: 0 });
}

export async function addReport(report: Omit<Report, "id">) {
  const id = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  await writeJson(`reports/${id}.json`, { ...report, id });
  revalidateTag(REPORTS, { expire: 0 });
}

export async function getReports() {
  if (!isStorageConfigured()) return [] as Report[];
  const reports = await cachedReports();
  return [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteReport(id: string) {
  await remove(`reports/${id}.json`);
  revalidateTag(REPORTS, { expire: 0 });
}

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** Returns clean film details, or a message for the person filling in the form. */
export function parseDetails(input: Record<string, unknown>, requireSource: boolean) {
  const title = text(input.title, 120);
  if (!title) return { error: "Give the film a title." };

  const license = input.license as License;
  if (!(license in LICENSES)) return { error: "Choose how this film is licensed." };

  const sourceUrl = text(input.sourceUrl, 500);
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
    return { error: "The proof link has to start with http:// or https://." };
  }
  if (requireSource && !sourceUrl) {
    return { error: "Add a link that shows this film can be shared." };
  }

  const year = Number(input.year);
  const details: FilmDetails = {
    title,
    year: Number.isInteger(year) && year >= 1880 && year <= 2100 ? year : null,
    director: text(input.director, 120),
    genre: GENRES.includes(input.genre as (typeof GENRES)[number]) ? (input.genre as string) : "Other",
    synopsis: text(input.synopsis, 1500),
    license,
    sourceUrl,
    submittedBy: text(input.submittedBy, 80),
  };
  return { details };
}
