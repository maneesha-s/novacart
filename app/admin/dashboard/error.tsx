
"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="p-6">
      <h1>Unable to load dashboard</h1>
      <p>Please try again.</p>

      <button onClick={() => reset()}>
        Retry
      </button>
    </main>
  );
}
