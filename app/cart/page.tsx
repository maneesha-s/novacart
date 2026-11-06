"use client";

import { useCart } from "@/app/providers/cart-provider";
import Link from "next/link";

export default function CartPage() {
  const { isLoaded, items, removeItem, updateQuantity, totalAmount } = useCart();

  if (!isLoaded) return <p role="status">Loading your cart…</p>;

  if (items.length === 0) {
    return (
      <section>
        <h1 className="text-3xl font-bold">Shopping Cart</h1>

        <p className="mt-4 text-gray-600">Your cart is empty.</p>
      </section>
    );
  }

  return (
    <section>
      <h1 className="text-3xl font-bold">Shopping Cart</h1>

      <div className="mt-8 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <h2 className="font-semibold">{item.name}</h2>

              <p className="text-gray-600">
                ₹{item.price.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="border px-3 py-1"
              >
                -
              </button>

              <span>{item.quantity}</span>

              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="border px-3 py-1"
              >
                +
              </button>

              <button
                onClick={() => removeItem(item.id)}
                className="ml-4 text-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-right">
        <p className="text-xl font-bold">
          Total: ₹{totalAmount.toLocaleString("en-IN")}
        </p>
      </div>
      <div className="mt-8 flex justify-end">
        <Link
          href="/checkout"
          className="rounded-lg bg-black px-6 py-3 text-white"
        >
          Proceed to Checkout
        </Link>
      </div>
    </section>
  );
}
