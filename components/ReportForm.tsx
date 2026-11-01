"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export function ReportForm({ film }: { film: string }) {
  const [form, setForm] = useState({ film, name: "", email: "", claim: "" });
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm({ ...form, [key]: event.target.value });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await api("/api/report", form);
      setSent(true);
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  if (sent) return <p className="notice">Report received. It goes straight to the review queue.</p>;

  return (
    <form className="fields login" onSubmit={submit}>
      <label>
        Film title or link
        <input required value={form.film} onChange={set("film")} />
      </label>
      <label>
        Your name
        <input required autoComplete="name" value={form.name} onChange={set("name")} />
      </label>
      <label>
        Your email
        <input required type="email" autoComplete="email" value={form.email} onChange={set("email")} />
      </label>
      <label>
        What is wrong
        <textarea
          required
          rows={6}
          placeholder="If you own the rights, tell us what you own and where the original is."
          value={form.claim}
          onChange={set("claim")}
        />
      </label>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <button className="button">Send report</button>
    </form>
  );
}
