"use client";
import { useFormStatus } from "react-dom";
export default function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="rounded-lg border px-4 py-2 disabled:opacity-50">{pending ? "Saving…" : children}</button>;
}
