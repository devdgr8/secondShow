"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { fileUrl, posterUrl } from "@/lib/archive-urls";
import { GENRES, LICENSES, type FilmDetails, type License } from "@/lib/types";
import { Reels } from "./Reels";

type Form = Omit<FilmDetails, "year"> & { year: string };
type Found = {
  id: string;
  files: string[];
  title: string;
  year: number | null;
  director: string;
  synopsis: string;
  license: License;
};

export function Submit({ admin }: { admin: boolean }) {
  const [link, setLink] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id: string; status: string } | null>(null);

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const film = await api<Found>("/api/film/lookup", { link });
      setFound(film);
      setForm({
        title: film.title,
        year: film.year ? String(film.year) : "",
        director: film.director,
        genre: "Drama",
        synopsis: film.synopsis,
        license: film.license,
        sourceUrl: "",
        submittedBy: "",
      });
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setResult(
        await api<{ id: string; status: string }>("/api/film/submit", {
          link,
          attested,
          details: { ...form, year: Number(form?.year) || null },
        }),
      );
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => current && { ...current, [key]: value });

  if (result) {
    return (
      <div className="booth-done">
        <Reels progress={1} spinning={false} />
        {result.status === "live" ? (
          <>
            <h2>It is on the marquee.</h2>
            <p>Your film is public. Anyone with the link can watch it.</p>
            <Link href={`/film/${result.id}`} className="button">
              See it on screen
            </Link>
          </>
        ) : (
          <>
            <h2>Reel received.</h2>
            <p>It goes live once it has been reviewed. Thank you for sending it in.</p>
            <Link href="/" className="button">
              Back to the lobby
            </Link>
          </>
        )}
      </div>
    );
  }

  if (!found || !form) {
    return (
      <>
        <ol className="steps">
          <li>
            <h2>Upload it</h2>
            <p>
              Internet Archive hosts the film for free. A free account takes a minute and needs no
              card. Large files are fine.
            </p>
            <a className="button" href="https://archive.org/upload" target="_blank" rel="noopener">
              Open archive.org
            </a>
          </li>
          <li>
            <h2>Paste the link</h2>
            <p>When the upload finishes, copy the film&apos;s page address and paste it here.</p>
            <form className="fields" onSubmit={search}>
              <div className="link-row">
                <input
                  required
                  aria-label="Internet Archive link"
                  placeholder="https://archive.org/details/..."
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                />
                <button className="button" disabled={busy}>
                  {busy ? "Looking" : "Find it"}
                </button>
              </div>
            </form>
          </li>
        </ol>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
      </>
    );
  }

  return (
    <form className="details" onSubmit={send}>
      <div className="details-preview">
        <video controls playsInline preload="metadata" poster={posterUrl(found.id)}>
          {found.files.map((file) => (
            <source key={file} src={fileUrl(found.id, file)} />
          ))}
        </video>
        <p className="hint">Check that it plays with sound before you go on.</p>
        <button
          type="button"
          className="button-quiet"
          onClick={() => {
            setFound(null);
            setError("");
          }}
        >
          Use a different link
        </button>
      </div>

      <div className="fields">
        <label>
          Title
          <input required maxLength={120} value={form.title} onChange={(e) => set("title", e.target.value)} />
        </label>
        <div className="field-row">
          <label>
            Year
            <input inputMode="numeric" maxLength={4} value={form.year} onChange={(e) => set("year", e.target.value)} />
          </label>
          <label>
            Genre
            <select value={form.genre} onChange={(e) => set("genre", e.target.value)}>
              {GENRES.map((genre) => (
                <option key={genre}>{genre}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Director
          <input maxLength={120} value={form.director} onChange={(e) => set("director", e.target.value)} />
        </label>
        <label>
          Synopsis
          <textarea rows={4} maxLength={1500} value={form.synopsis} onChange={(e) => set("synopsis", e.target.value)} />
        </label>
        <label>
          Rights
          <select value={form.license} onChange={(e) => set("license", e.target.value as License)}>
            {Object.entries(LICENSES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {admin ? "Proof link (optional)" : "Proof link"}
          <input
            type="url"
            required={!admin}
            placeholder="https://"
            value={form.sourceUrl}
            onChange={(e) => set("sourceUrl", e.target.value)}
          />
          <small>
            A page showing the film is public domain, its licence, or your own page as its maker.
          </small>
        </label>
        {!admin && (
          <>
            <label>
              Your name or studio
              <input maxLength={80} value={form.submittedBy} onChange={(e) => set("submittedBy", e.target.value)} />
            </label>
            <label className="attest">
              <input type="checkbox" required checked={attested} onChange={(e) => setAttested(e.target.checked)} />
              <span>
                I made this film, hold the rights to it, or it is public domain or openly licensed.
                Having downloaded a film does not give me the right to share it.
              </span>
            </label>
          </>
        )}
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <button className="button" disabled={busy}>
          {admin ? "Publish" : "Send for review"}
        </button>
      </div>
    </form>
  );
}
