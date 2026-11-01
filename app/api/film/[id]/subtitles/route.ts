import { NextResponse } from "next/server";
import { listSubtitles, SUBTITLE_CACHE_SECONDS } from "@/lib/archive";
import { fileUrl } from "@/lib/archive-urls";
import { isAdmin } from "@/lib/auth";
import { getFilm } from "@/lib/catalog";

const MAX_BYTES = 2 * 1024 * 1024;

const toVtt = (text: string) => {
  const clean = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  if (clean.startsWith("WEBVTT")) return clean;
  return `WEBVTT\n\n${clean.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")}`;
};

/** Browsers only accept WebVTT, and Archive files are usually SRT, so they are converted here. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const missing = new NextResponse("Not found", { status: 404 });

  const film = await getFilm(id);
  if (!film || (film.status !== "live" && !(await isAdmin()))) return missing;

  const file = new URL(request.url).searchParams.get("file");
  const subtitles = await listSubtitles(id);
  if (!file || !subtitles.some((subtitle) => subtitle.file === file)) return missing;

  const response = await fetch(fileUrl(id, file), {
    signal: AbortSignal.timeout(8_000),
    next: { revalidate: SUBTITLE_CACHE_SECONDS },
  }).catch(() => null);
  if (!response?.ok) return missing;

  const text = await response.text();
  if (text.length > MAX_BYTES) return missing;

  return new NextResponse(toVtt(text), {
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
      "Cache-Control": `public, s-maxage=${SUBTITLE_CACHE_SECONDS}`,
    },
  });
}
