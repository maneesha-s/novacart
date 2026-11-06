"use client";
import Link from "next/link";
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <section className="py-12 text-center"><h2 className="text-2xl font-bold">We couldn’t load this page</h2><p className="mt-3">Please try again in a moment.</p><button onClick={retry} className="mt-5 rounded border px-5 py-2">Try again</button><Link href="/" className="ml-4 underline">Home</Link></section>;
}
