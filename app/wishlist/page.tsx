import Link from "next/link";
import { requireUser } from "@/lib/authorization";
// import { getWishlistItems } from "@/lib/data/wishlist";
import { setWishlist } from "@/app/actions/wishlist";
import { getWishlist } from "@/lib/data/wishlists";
import ProductCard from "../ui/product-card";
// import ProductCard from "@/components/product-card";

export default async function WishlistPage() {
  const user = await requireUser();

  const items = await getWishlist(user.id);

  return (
    <section>
      <h1 className="text-3xl font-bold">Wishlist</h1>

      {!items.length && (
        <p className="mt-6">
          Your wishlist is empty.{" "}
          <Link href="/products" className="underline">
            Browse products
          </Link>
        </p>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ product }) => (
          <div key={product.id}>
            {product.isActive && product.category.isActive ? (
              <ProductCard
                product={{
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: Number(product.price),
                  image: product.image,
                  categoryName: product.category.name,
                }}
              />
            ) : <p className="rounded border p-5">{product.name} is currently unavailable.</p>}

            <form action={setWishlist} className="mt-2">
              <input type="hidden" name="productId" value={product.id} />

              <input type="hidden" name="intent" value="remove" />

              <button type="submit" className="text-red-600">
                Remove from wishlist
              </button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
