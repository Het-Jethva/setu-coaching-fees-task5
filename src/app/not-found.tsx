import Link from "next/link";
export default function NotFound() {
  return (
    <main className="loading-layout">
      <h1>That page isn't here.</h1>
      <Link href="/">Return to your workspace</Link>
    </main>
  );
}
