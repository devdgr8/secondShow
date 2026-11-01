"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { archivePage } from "@/lib/archive-urls";
import { runtime } from "@/lib/format";
import { LICENSES, type Film, type Report } from "@/lib/types";
import { api } from "@/lib/api";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/login", { password });
      router.refresh();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="fields login" onSubmit={submit}>
      <label>
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <button className="button" disabled={busy}>
        {busy ? "Checking" : "Enter the booth"}
      </button>
    </form>
  );
}

export function AdminPanel({
  films,
  reports,
}: {
  films: Film[];
  reports: Report[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const act = async (id: string, action: string) => {
    if (action === "delete" && !window.confirm("Delete this film for good? This cannot be undone.")) {
      return;
    }
    setBusy(id);
    setError("");
    try {
      await api("/api/admin/film", { id, action });
      router.refresh();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy("");
    }
  };

  const dismiss = async (id: string) => {
    setBusy(id);
    await api("/api/admin/report", { id }).catch((failure) => setError(failure.message));
    setBusy("");
    router.refresh();
  };

  const signOut = async () => {
    await api("/api/admin/logout", {});
    router.refresh();
  };

  const pending = films.filter((film) => film.status === "pending");
  const live = films.filter((film) => film.status === "live");

  const row = (film: Film) => (
    <li key={film.id} className="admin-row">
      <div>
        <Link href={`/film/${film.id}`}>{film.title}</Link>
        <small>
          {[runtime(film.runtimeSec), LICENSES[film.license], film.submittedBy]
            .filter(Boolean)
            .join(" · ")}
        </small>
        <a href={archivePage(film.id)} target="_blank" rel="noopener noreferrer">
          {archivePage(film.id)}
        </a>
        {film.sourceUrl && (
          <a href={film.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
            {film.sourceUrl}
          </a>
        )}
      </div>
      <div className="admin-actions">
        {film.status === "pending" ? (
          <button disabled={busy === film.id} onClick={() => act(film.id, "publish")}>
            Publish
          </button>
        ) : (
          <button disabled={busy === film.id} onClick={() => act(film.id, "unpublish")}>
            Take off the board
          </button>
        )}
        <button disabled={busy === film.id} onClick={() => act(film.id, "delete")}>
          Delete
        </button>
      </div>
    </li>
  );

  return (
    <>
      <p className="admin-links">
        <Link href="/submit" className="button">
          Add a film
        </Link>
        <button className="button-quiet" onClick={signOut}>
          Sign out
        </button>
      </p>
      {error && <p className="notice notice-error" role="alert">{error}</p>}

      <h2>Waiting for review ({pending.length})</h2>
      {pending.length ? <ul className="admin-list">{pending.map(row)}</ul> : <p className="hint">Nothing in the queue.</p>}

      <h2>Reports ({reports.length})</h2>
      {reports.length ? (
        <ul className="admin-list">
          {reports.map((report) => (
            <li key={report.id} className="admin-row">
              <div>
                <strong>{report.film}</strong>
                <small>
                  {report.name} · {report.email} · {new Date(report.createdAt).toLocaleDateString()}
                </small>
                <p>{report.claim}</p>
              </div>
              <div className="admin-actions">
                <button disabled={busy === report.id} onClick={() => dismiss(report.id)}>
                  Close report
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">No open reports.</p>
      )}

      <h2>On the board ({live.length})</h2>
      {live.length ? <ul className="admin-list">{live.map(row)}</ul> : <p className="hint">No films are live yet.</p>}
    </>
  );
}
