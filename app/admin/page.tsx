import type { Metadata } from "next";
import { AdminLogin, AdminPanel } from "@/components/Admin";
import { isAdmin } from "@/lib/auth";
import { getFilms, getReports } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booth", robots: { index: false } };

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <main className="booth booth-narrow">
        <p className="eyebrow">Staff only</p>
        <h1>The booth is locked.</h1>
        <AdminLogin />
      </main>
    );
  }

  const [films, reports] = await Promise.all([getFilms(), getReports()]);
  return (
    <main className="booth">
      <p className="eyebrow">Staff only</p>
      <h1>The booth.</h1>
      <AdminPanel films={films} reports={reports} />
    </main>
  );
}
