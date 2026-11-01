import type { Metadata } from "next";
import Link from "next/link";
import { Submit } from "@/components/Submit";
import { isAdmin } from "@/lib/auth";
import { isStorageConfigured, limits } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Submit a film" };

export default async function SubmitPage() {
  const admin = await isAdmin();
  const configured = isStorageConfigured();
  const open = configured && (admin || limits.publicSubmissionsOpen);

  return (
    <main className="booth">
      <p className="eyebrow">The projection booth</p>
      <h1>{admin ? "Thread a new film." : "Send us your film."}</h1>
      <p className="lede">
        {admin
          ? "You are signed in, so this film goes live as soon as you publish it."
          : "Films are hosted on Internet Archive and shown here. Every submission is watched before it goes on the board."}
      </p>
      {open ? (
        <Submit admin={admin} />
      ) : (
        <p className="notice">
          {configured
            ? "Submissions are closed right now."
            : "The catalogue is not connected yet. Follow SETUP.md to finish setting up the site."}
        </p>
      )}
      {!admin && (
        <p className="hint">
          Running this cinema? <Link href="/admin">Sign in</Link> first.
        </p>
      )}
    </main>
  );
}
