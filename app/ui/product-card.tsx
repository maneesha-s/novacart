import Image from "next/image";
import Link from "next/link";
import type { ProductCardData } from "@/types/product";

type ProductCardProps = {
  product: ProductCardData;
};

export default function ProductCard({
  product,
}: ProductCardProps) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-56 w-full overflow-hidden bg-slate-100">
        <Image
          src={product.image ?? "/products/placeholder.svg"}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-300 group-hover:scale-105"
          loading="eager"
        />
      </div>

      <div className="p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#698076]">
          {product.categoryName}
        </p>

        <h2 className="mt-2 text-lg font-bold text-[#142b2a]">
          {product.name}
        </h2>

        <p className="mt-3 text-lg font-bold">
          ₹{product.price.toLocaleString("en-IN")}
        </p>

        <Link
          href={`/products/${product.slug}`}
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#edf1e8] px-4 py-3 text-sm font-semibold text-[#142b2a] transition hover:bg-[#dce6d3]"
        >
          View Product
        </Link>
      </div>
    </article>
  );
}