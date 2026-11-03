"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="loading-layout">
      <h1>The workspace could not load.</h1>
      <p>Your posted payments are preserved. Retry the page.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
