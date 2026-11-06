"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useCart } from "@/app/providers/cart-provider";
import ShopIcon from "./shop-icon";

const subscribe = () => () => {};

export default function CartLink() {
  const { totalItems } = useCart();
  const displayedItems = useSyncExternalStore(
    subscribe,
    () => totalItems,
    () => 0,
  );

  return <Link href="/cart" aria-label={`Cart, ${displayedItems} items`} className="flex items-center gap-2 rounded-lg py-1 font-semibold"><span className="relative"><ShopIcon name="bag" className="size-6" /><span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-[#f7c76c] px-1 text-[10px] text-[#142b2a]">{displayedItems}</span></span><span className="hidden text-sm sm:block">Cart</span></Link>;
}
