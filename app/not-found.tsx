import Link from "next/link";

export default function NotFound() {
  return (
    <main className="house-dark">
      <h1>This reel is missing.</h1>
      <p>
        It may have been taken off the board. <Link href="/">Back to the lobby</Link>
      </p>
    </main>
  );
}
