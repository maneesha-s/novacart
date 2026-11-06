"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProductFilters({ categories }: { categories: { name: string; slug: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const category = searchParams.get("category") ?? "";
  const sort = searchParams.get("sort") ?? "";

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (search) {
        params.set("search", search);
      } else {
        params.delete("search");
      }

      params.set("page", "1");

      router.push(`/products?${params.toString()}`);
    }, 500);

    return () => clearTimeout(timeout);
  }, [search, router, searchParams]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    params.set("page", "1");

    router.push(`/products?${params.toString()}`);
  }

  return (
    <div className="mb-8 grid gap-4 md:grid-cols-3">
      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounded-lg border px-4 py-2"
      />

      <select
        value={category}
        onChange={(e) => updateParam("category", e.target.value)}
        className="rounded-lg border px-4 py-2"
      >
        <option value="">All Categories</option>
        {categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}
      </select>

      <select
        value={sort}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="rounded-lg border px-4 py-2"
      >
        <option value="">SORT: Newest</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
      </select>
    </div>
  );
}
