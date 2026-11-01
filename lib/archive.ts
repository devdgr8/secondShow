import type { License } from "./types";

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const MAX_SOURCES = 2;
export const SUBTITLE_CACHE_SECONDS = 600;

type ArchiveFile = { name: string; size?: string; length?: string; format?: string };
type ArchiveItem = {
  metadata?: Record<string, unknown>;
  files?: ArchiveFile[];
  is_dark?: boolean;
};

export type Lookup = {
  id: string;
  files: string[];
  runtimeSec: number | null;
  title: string;
  year: number | null;
  director: string;
  synopsis: string;
  license: License;
};

export class LookupError extends Error {}

/** Accepts an archive.org link in any common form, or a bare identifier. */
export function parseArchiveId(link: unknown) {
  if (typeof link !== "string") return null;
  const value = link.trim();
  if (IDENTIFIER.test(value) && !value.includes("archive.org")) return value;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!/(^|\.)archive\.org$/i.test(url.hostname)) return null;
    const [kind, id] = url.pathname.split("/").filter(Boolean);
    return ["details", "download", "embed"].includes(kind) && IDENTIFIER.test(id ?? "") ? id : null;
  } catch {
    return null;
  }
}

const first = (value: unknown) => String((Array.isArray(value) ? value[0] : value) ?? "").trim();

const plainText = (value: unknown) =>
  first(value)
    .replace(/<br\s*\/?>|<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

function seconds(length: string | undefined) {
  if (!length) return null;
  const parts = length.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  const total = parts.reduce((sum, part) => sum * 60 + part, 0);
  return total > 0 ? Math.round(total) : null;
}

function guessLicense(url: string): License {
  return /publicdomain/i.test(url) || !url ? "public-domain" : "creative-commons";
}

/** Larger files are usually the upload itself; the runner-up is a fallback for the player. */
function playableFiles(files: ArchiveFile[]) {
  return files
    .filter((file) => /\.(mp4|m4v|webm)$/i.test(file.name))
    .sort((a, b) => Number(b.size ?? 0) - Number(a.size ?? 0));
}

export type Subtitle = { file: string; language: string; label: string };

/** Reads a language code from the end of a name, as in `film.hi.srt`. */
function subtitleInfo(file: string): Subtitle {
  const name = file.replace(/\.asr(?=\.(srt|vtt)$)/i, "");
  const code = name.match(/[._-]([a-z]{2,3})\.(srt|vtt)$/i)?.[1].toLowerCase();
  let label: string | undefined;
  try {
    const language = code && new Intl.DisplayNames(["en"], { type: "language", fallback: "none" }).of(code);
    label = language || undefined;
  } catch {}
  return label && code
    ? { file, language: code, label }
    : { file, language: "en", label: "Subtitles" };
}

/** Finds subtitle files beside a film. A failed lookup only hides the subtitles. */
export async function listSubtitles(id: string): Promise<Subtitle[]> {
  try {
    const response = await fetch(`https://archive.org/metadata/${id}/files`, {
      signal: AbortSignal.timeout(4_000),
      next: { revalidate: SUBTITLE_CACHE_SECONDS },
    });
    const { result } = (await response.json()) as { result?: ArchiveFile[] };
    // Archive can hold the same subtitles as both SRT and VTT, so each label appears once.
    const byLabel = new Map<string, Subtitle>();
    for (const { name } of result ?? []) {
      if (!/\.(srt|vtt)$/i.test(name)) continue;
      const subtitle = subtitleInfo(name);
      if (!byLabel.has(subtitle.label) || /\.vtt$/i.test(name)) byLabel.set(subtitle.label, subtitle);
    }
    return [...byLabel.values()].sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}

export async function lookUpFilm(id: string): Promise<Lookup> {
  const response = await fetch(`https://archive.org/metadata/${id}`, {
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) throw new LookupError("Internet Archive did not answer. Try again in a minute.");

  const item = (await response.json().catch(() => null)) as ArchiveItem | null;
  const metadata = item?.metadata;
  if (!metadata) {
    throw new LookupError("That link was not found. New uploads can take a few minutes to appear.");
  }
  if (item?.is_dark || metadata["access-restricted-item"] === "true") {
    throw new LookupError("This item is not publicly available on Internet Archive.");
  }
  if (metadata.mediatype !== "movies") throw new LookupError("That item is not a video.");

  const playable = playableFiles(item?.files ?? []);
  if (playable.length === 0) {
    throw new LookupError(
      "Internet Archive has no browser-ready version yet. It converts new uploads, which can take from minutes to a day, so try again later.",
    );
  }

  const year = Number(first(metadata.year || metadata.date).slice(0, 4));
  return {
    id,
    files: playable.slice(0, MAX_SOURCES).map((file) => file.name),
    runtimeSec: seconds(playable[0].length),
    title: plainText(metadata.title).slice(0, 120),
    year: year >= 1880 && year <= 2100 ? year : null,
    director: plainText(metadata.director || metadata.creator).slice(0, 120),
    synopsis: plainText(metadata.description).slice(0, 1500),
    license: guessLicense(first(metadata.licenseurl)),
  };
}
