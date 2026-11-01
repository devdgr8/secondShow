import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { revalidateTag, unstable_cache } from "next/cache";
import { isStorageConfigured } from "./config";
import { bucket, r2 } from "./r2";
import { GENRES, LICENSES, type Film, type FilmDetails, type License, type Report } from "./types";

const TAG = "catalog";

export const filmPrefix = (id: string) => `movies/${id}/`;
const metaKey = (id: string) => `${filmPrefix(id)}meta.json`;
export const posterKey = (id: string) => `${filmPrefix(id)}poster.jpg`;

async function listKeys(prefix: string) {
  const objects: { key: string; size: number }[] = [];
  let token: string | undefined;
  do {
    const page = await r2().send(
      new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix, ContinuationToken: token }),
    );
    for (const item of page.Contents ?? []) {
      objects.push({ key: item.Key as string, size: item.Size ?? 0 });
    }
    token = page.NextContinuationToken;
  } while (token);
  return objects;
}

const readJson = async <T,>(key: string) => {
  const object = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  return JSON.parse(await (object.Body as { transformToString(): Promise<string> }).transformToString()) as T;
};

const writeJson = (key: string, value: unknown) =>
  r2().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: JSON.stringify(value),
      ContentType: "application/json",
    }),
  );

async function loadCatalog() {
  const objects = await listKeys("movies/");
  const metas = objects.filter((object) => object.key.endsWith("/meta.json"));
  const films = await Promise.all(metas.map((meta) => readJson<Film>(meta.key)));
  films.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { films, usedBytes: objects.reduce((sum, object) => sum + object.size, 0) };
}

const cachedCatalog = unstable_cache(loadCatalog, ["catalog"], { tags: [TAG], revalidate: 300 });

export async function getCatalog() {
  if (!isStorageConfigured()) return { films: [] as Film[], usedBytes: 0 };
  return cachedCatalog();
}

export const getFilm = async (id: string) =>
  (await getCatalog()).films.find((film) => film.id === id);

const refresh = () => revalidateTag(TAG, { expire: 0 });

export async function saveFilm(film: Film) {
  await writeJson(metaKey(film.id), film);
  refresh();
}

export async function deleteFilm(id: string) {
  const objects = await listKeys(filmPrefix(id));
  await Promise.all(
    objects.map(({ key }) => r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }))),
  );
  refresh();
}

export async function addReport(report: Omit<Report, "key">) {
  const key = `reports/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  await writeJson(key, { ...report, key });
}

export async function getReports() {
  if (!isStorageConfigured()) return [];
  const objects = await listKeys("reports/");
  const reports = await Promise.all(objects.map(({ key }) => readJson<Report>(key)));
  return reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const deleteReport = (key: string) =>
  r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));

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
