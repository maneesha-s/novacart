import { Suspense } from "react";
import ProductDetails from "@/app/ui/product-details";
import ProductModal from "@/app/ui/product-modal";
export { generateMetadata } from "@/app/products/[slug]/page";

// (.) intercepts the products segment beside this root parallel slot.
export default function ProductQuickView({ params }: { params: Promise<{ slug: string }> }) {
  return <ProductModal><Suspense fallback={<p role="status">Loading product…</p>}>
    <ProductDetails params={params} />
  </Suspense></ProductModal>;
}
