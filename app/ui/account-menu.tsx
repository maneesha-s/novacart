"use client";
import { useEffect, useRef } from "react";
import ShopIcon from "./shop-icon";
export default function AccountMenu({ name, signedIn, children }: { name?: string | null; signedIn: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (ref.current && event.target instanceof Node && !ref.current.contains(event.target)) ref.current.open = false;
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  return <details ref={ref} className="relative"
    onClick={event => { if (event.target instanceof Element && event.target.closest("a") && ref.current) ref.current.open = false; }}
    onSubmit={() => { if (ref.current) ref.current.open = false; }}
    onKeyDown={event => { if (event.key === "Escape" && ref.current) { ref.current.open = false; ref.current.querySelector("summary")?.focus(); } }}>
    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg py-1 text-sm [&::-webkit-details-marker]:hidden"><ShopIcon name="user" className="size-5" /><span><span className="hidden text-[10px] text-white/65 sm:block">Hello, {name?.split(" ")[0] ?? "welcome"}</span><span className="font-semibold">{signedIn ? "My account" : "Sign in"} <span className="text-[10px]">⌄</span></span></span></summary>
    {children}
  </details>;
}
