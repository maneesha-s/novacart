import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ProductCard from "@/app/ui/product-card";
import { getProducts } from "@/lib/data/products";

type ProductsPageProps = {
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const rawParams = await searchParams;
  const params = Object.fromEntries(Object.entries(rawParams).map(([key, value]) => [key, typeof value === "string" ? value : undefined])) as Awaited<ProductsPageProps["searchParams"]>;
  const categories = await prisma.category.findMany({ where: { isActive: true }, select: { name: true, slug: true }, orderBy: { name: "asc" } });

  const page = Number(params.page ?? "1");

  const productData = await getProducts({
    search: params.search,
    category: params.category,
    sort: params.sort,
    page: Number.isNaN(page) ? 1 : page,
  });

  const {
    items: products,
    totalItems,
    totalPages,
    page: currentPage,
  } = productData;

  function createPageUrl(pageNumber: number) {
    const query = new URLSearchParams();

    if (params.search) {
      query.set("search", params.search);
    }

    if (params.category) {
      query.set("category", params.category);
    }

    if (params.sort) {
      query.set("sort", params.sort);
    }

    query.set("page", String(pageNumber));

    return `/products?${query.toString()}`;
  }

  return (
    <section>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Products</h1>

        <p className="mt-2 text-gray-600">Browse our latest products.</p>
      </div>

      <form className="mb-8 grid gap-4 md:grid-cols-4">
        <input
          aria-label="Search products"
          type="text"
          name="search"
          placeholder="Search products..."
          defaultValue={params.search}
          className="rounded-lg border px-4 py-2"
        />

        <select
          aria-label="Category"
          name="category"
          defaultValue={params.category ?? ""}
          className="rounded-lg border px-4 py-2"
        >
          <option value="">All Categories</option>

          {categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}
        </select>

        <select
          aria-label="Sort products"
          name="sort"
          defaultValue={params.sort ?? ""}
          className="rounded-lg border px-4 py-2"
        >
          <option value="">Newest</option>

          <option value="price-asc">Price: Low to High</option>

          <option value="price-desc">Price: High to Low</option>
        </select>

        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Apply
        </button>
      </form>

      <div className="mb-6 text-sm text-gray-500">
        {totalItems} product
        {totalItems === 1 ? "" : "s"} found
      </div>

      {products.length === 0 ? (
        <p className="text-gray-500">No products found.</p>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              {currentPage > 1 && (
                <Link
                  href={createPageUrl(currentPage - 1)}
                  className="rounded-lg border px-4 py-2"
                >
                  Previous
                </Link>
              )}

              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>

              {currentPage < totalPages && (
                <Link
                  href={createPageUrl(currentPage + 1)}
                  className="rounded-lg border px-4 py-2"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
