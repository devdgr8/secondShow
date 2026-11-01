import type { Metadata } from "next";
import Link from "next/link";
import { Uploader } from "@/components/Uploader";
import { isAdmin } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { isStorageConfigured, limits } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Submit a film" };

export default async function SubmitPage() {
  const admin = await isAdmin();
  const configured = isStorageConfigured();
  const { usedBytes } = await getCatalog();
  const full = usedBytes >= limits.totalBytes;
  const open = configured && !full && (admin || limits.publicUploadsOpen);

  return (
    <main className="booth">
      <p className="eyebrow">The projection booth</p>
      <h1>{admin ? "Thread a new film." : "Send us your film."}</h1>
      <p className="lede">
        {admin
          ? "You are signed in, so this film goes live as soon as it finishes uploading."
          : "Every submission is watched before it goes on the board. Large files are fine: they upload in pieces and survive a dropped connection."}
      </p>
      {open ? (
        <Uploader admin={admin} />
      ) : (
        <p className="notice">
          {!configured
            ? "Storage is not connected yet. Follow SETUP.md to finish setting up the site."
            : full
              ? "The cinema's storage is full right now."
              : "Submissions are closed right now."}
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
