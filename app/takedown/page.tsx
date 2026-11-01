import type { Metadata } from "next";
import { ReportForm } from "@/components/ReportForm";

export const metadata: Metadata = { title: "Report a film" };

export default async function TakedownPage({
  searchParams,
}: {
  searchParams: Promise<{ film?: string }>;
}) {
  const { film } = await searchParams;
  return (
    <main className="booth booth-narrow">
      <p className="eyebrow">Rights and takedowns</p>
      <h1>Report a film.</h1>
      <p className="lede">
        Second Show plays films that are public domain, openly licensed, or shared by the people who
        own them. If something here is yours and should not be, tell us and we will take it down.
      </p>
      <ReportForm film={film ?? ""} />
    </main>
  );
}
