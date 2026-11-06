"use client";
export default function Error({ retry }: { error: Error; retry: () => void }) {
  return <div><h2>Unable to load products.</h2><button onClick={retry}>Try again</button></div>;
}
