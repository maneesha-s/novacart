"use client";
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <html lang="en"><body><main><h1>NovaCart is temporarily unavailable</h1><p>Please try again in a moment.</p><button onClick={retry}>Try again</button></main></body></html>;
}
