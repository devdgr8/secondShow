import type { Metadata } from "next";
import { Changeover } from "@/components/Changeover";

export const metadata: Metadata = {
  title: "Changeover",
  description: "Switch projectors on the cue dots and keep the audience in their seats.",
};

export default function ChangeoverPage() {
  return (
    <main className="booth game-page">
      <h1>Changeover</h1>
      <p className="lede">Swap projectors as each reel ends, and don&apos;t let the audience notice.</p>
      <Changeover />
    </main>
  );
}
