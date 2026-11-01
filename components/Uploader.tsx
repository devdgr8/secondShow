"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { bytes } from "@/lib/format";
import { GENRES, LICENSES, type FilmDetails, type License } from "@/lib/types";
import {
  abortUpload,
  ApiError,
  finishUpload,
  sendParts,
  sendPoster,
  startUpload,
  type Session,
} from "@/lib/upload-client";
import { Reels } from "./Reels";

type Stage = "pick" | "details" | "sending" | "done";
type Form = Omit<FilmDetails, "year"> & { year: string };

const blankForm: Form = {
  title: "",
  year: "",
  director: "",
  genre: "Drama",
  synopsis: "",
  license: "public-domain",
  sourceUrl: "",
  submittedBy: "",
};

const POSTER_WIDTH = 720;
const CONVERT = (name: string) =>
  `ffmpeg -i "${name}" -c:v libx264 -crf 22 -preset medium -c:a aac -movflags +faststart film.mp4`;

const typeOf = (file: File) => {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "mov" ? "video/quicktime" : extension === "webm" ? "video/webm" : "video/mp4";
};

const resumeKey = (file: File) => `ss-upload:${file.name}:${file.size}:${file.lastModified}`;
const store = {
  read(key: string) {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "null");
    } catch {
      return null;
    }
  },
  write(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  clear(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

function drawPoster(source: HTMLVideoElement | HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(POSTER_WIDTH, width);
  canvas.height = Math.round((canvas.width / width) * height);
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.84));
}

export function Uploader({ admin }: { admin: boolean }) {
  const [stage, setStage] = useState<Stage>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [form, setForm] = useState<Form>(blankForm);
  const [attested, setAttested] = useState(false);
  const [poster, setPoster] = useState<Blob | null>(null);
  const [posterUrl, setPosterUrl] = useState("");
  const [runtimeSec, setRuntimeSec] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [unplayable, setUnplayable] = useState("");
  const [sent, setSent] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [resuming, setResuming] = useState(false);
  const [result, setResult] = useState<{ id: string; status: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  const video = useRef<HTMLVideoElement>(null);
  const controller = useRef<AbortController | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const posterPicked = useRef(false);

  useEffect(() => {
    if (stage !== "sending") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [stage]);

  const pick = useCallback((chosen: File | undefined) => {
    if (!chosen) return;
    setError("");
    setUnplayable("");
    setPoster(null);
    setPosterUrl("");
    posterPicked.current = false;
    const saved = store.read(resumeKey(chosen));
    setResuming(Boolean(saved));
    setForm(
      saved?.form ?? {
        ...blankForm,
        title: chosen.name.replace(/\.[^.]+$/, "").replace(/[._]+/g, " ").trim(),
      },
    );
    setFile(chosen);
    setPreviewUrl(URL.createObjectURL(chosen));
    setStage("details");
  }, []);

  const capture = async () => {
    const element = video.current;
    if (!element?.videoWidth) return;
    const blob = await drawPoster(element, element.videoWidth, element.videoHeight);
    if (blob) {
      setPoster(blob);
      setPosterUrl(URL.createObjectURL(blob));
    }
  };

  const onMetadata = () => {
    const element = video.current;
    if (!element) return;
    setRuntimeSec(Number.isFinite(element.duration) ? element.duration : null);
    if (!element.videoWidth) {
      setUnplayable("This file has no picture a browser can decode.");
      return;
    }
    element.currentTime = element.duration * 0.1;
  };

  const onSeeked = () => {
    if (!posterPicked.current) capture();
  };

  const uploadPosterImage = async (image: File | undefined) => {
    if (!image) return;
    const element = new Image();
    element.src = URL.createObjectURL(image);
    await element.decode();
    const blob = await drawPoster(element, element.naturalWidth, element.naturalHeight);
    if (blob) {
      posterPicked.current = true;
      setPoster(blob);
      setPosterUrl(URL.createObjectURL(blob));
    }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setError("");
    setSent(0);
    setStage("sending");

    const abort = new AbortController();
    controller.current = abort;
    const key = resumeKey(file);
    const lock = await navigator.wakeLock?.request("screen").catch(() => null);

    let lastBytes = 0;
    let lastTime = performance.now();

    try {
      const saved = store.read(key);
      let session: Session = saved?.session ?? (await startUpload(file, typeOf(file), attested));
      sessionRef.current = session;
      store.write(key, { session, form });

      const track = (bytesSent: number) => {
        setSent(bytesSent);
        const now = performance.now();
        if (now - lastTime > 1000) {
          setSpeed(Math.max(0, (bytesSent - lastBytes) / ((now - lastTime) / 1000)));
          lastBytes = bytesSent;
          lastTime = now;
        }
      };

      let parts;
      try {
        parts = await sendParts(file, session, abort.signal, track);
      } catch (failure) {
        const expired = failure instanceof ApiError && failure.status === 410;
        if (!saved || !expired || abort.signal.aborted) throw failure;
        // Only a dead session restarts from zero. Anything else keeps its progress.
        store.clear(key);
        session = await startUpload(file, typeOf(file), attested);
        sessionRef.current = session;
        store.write(key, { session, form });
        parts = await sendParts(file, session, abort.signal, track);
      }

      if (poster) await sendPoster(session.token, poster, abort.signal);
      const details = { ...form, year: Number(form.year) || null };
      setResult(await finishUpload(session.token, parts, details, runtimeSec));
      store.clear(key);
      setStage("done");
    } catch (failure) {
      if (abort.signal.aborted) return;
      setError(
        `${(failure as Error).message} Pick the same file again and it will continue from where it stopped.`,
      );
      setStage("details");
      setResuming(true);
    } finally {
      await lock?.release().catch(() => {});
    }
  };

  const cancel = async () => {
    controller.current?.abort();
    if (file) store.clear(resumeKey(file));
    if (sessionRef.current) await abortUpload(sessionRef.current.token).catch(() => {});
    setStage("details");
    setResuming(false);
  };

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  if (stage === "pick") {
    return (
      <label
        className={dragging ? "drop drop-active" : "drop"}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          pick(event.dataTransfer.files[0]);
        }}
      >
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.m4v,.webm,.mov,.mkv,.avi"
          onChange={(event) => pick(event.target.files?.[0])}
        />
        <strong>Load the reel</strong>
        <span>Choose a video file, or drop it here. MP4 works best.</span>
      </label>
    );
  }

  if (stage === "sending" && file) {
    const progress = file.size ? sent / file.size : 0;
    const remaining = speed > 0 ? (file.size - sent) / speed : 0;
    return (
      <div className="booth-run" aria-live="polite">
        <Reels progress={progress} spinning />
        <p className="booth-percent">{Math.floor(progress * 100)}%</p>
        <div className="strip" role="progressbar" aria-valuenow={Math.floor(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="booth-log">
          {bytes(sent)} of {bytes(file.size)}
          {speed > 0 && ` · ${(speed / 1024 ** 2).toFixed(1)} MB/s`}
          {remaining > 60 && ` · about ${Math.ceil(remaining / 60)} min left`}
        </p>
        <p className="hint">Keep this tab open. If the connection drops, it picks up again.</p>
        <button type="button" className="button-quiet" onClick={cancel}>
          Cancel upload
        </button>
      </div>
    );
  }

  if (stage === "done" && result) {
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

  return (
    <form className="details" onSubmit={send}>
      <div className="details-preview">
        <video
          ref={video}
          src={previewUrl}
          controls
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={onMetadata}
          onSeeked={onSeeked}
          onError={() => setUnplayable("Browsers cannot play this file as it is.")}
        />
        {file && (
          <p className="booth-log">
            {file.name} · {bytes(file.size)}
          </p>
        )}
        {unplayable ? (
          <div className="notice">
            <p>
              <strong>{unplayable}</strong> Convert it to MP4 first with HandBrake (free), or this
              ffmpeg command, then pick the new file:
            </p>
            <code>{CONVERT(file?.name ?? "film.mkv")}</code>
          </div>
        ) : (
          <div className="poster-pick">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {posterUrl && <img src={posterUrl} alt="Chosen poster" />}
            <div>
              <button
                type="button"
                className="button-quiet"
                onClick={() => {
                  posterPicked.current = true;
                  capture();
                }}
              >
                Use this frame as poster
              </button>
              <label className="button-quiet">
                Upload poster image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => uploadPosterImage(event.target.files?.[0])}
                />
              </label>
            </div>
          </div>
        )}
        <button type="button" className="button-quiet" onClick={() => setStage("pick")}>
          Pick a different file
        </button>
      </div>

      <div className="fields">
        {resuming && <p className="notice">This file was partly sent. It will continue from there.</p>}
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
        <button className="button" disabled={Boolean(unplayable)}>
          {admin ? "Upload and publish" : "Send for review"}
        </button>
      </div>
    </form>
  );
}
