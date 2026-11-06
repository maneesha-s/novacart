"use client";

import { useCart } from "@/app/providers/cart-provider";

type AddToCartButtonProps = {
  product: {
    id: string;
    name: string;
    price: number;
  };
};

export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addItem } = useCart();
  return (
    <button
      onClick={() => addItem(product)}
      className="mt-8 rounded-lg bg-black px-6 py-3 text-white"
    >
      Add to Cart
    </button>
  );
}
