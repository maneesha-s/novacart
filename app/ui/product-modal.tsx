"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ProductModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return <dialog ref={dialogRef} aria-label="Product quick view"
    className="fixed inset-0 m-auto max-h-[90dvh] w-[min(95vw,1100px)] overflow-y-auto rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/60"
    onCancel={event => { event.preventDefault(); router.back(); }}
    onClick={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.target === event.currentTarget &&
        (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) router.back();
    }}>
    <div className="mb-4 flex justify-end"><button type="button" autoFocus onClick={() => router.back()}
      className="rounded-lg border px-4 py-2" aria-label="Close product quick view">Close ×</button></div>
    {children}
  </dialog>;
}
