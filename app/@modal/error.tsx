"use client";
import ProductModal from "@/app/ui/product-modal";
export default function ModalError({ retry }: { error: Error; retry: () => void }) {
  return <ProductModal><h2 className="text-xl font-bold">Unable to load this product</h2><button onClick={retry} className="mt-4 rounded border px-4 py-2">Try again</button></ProductModal>;
}
