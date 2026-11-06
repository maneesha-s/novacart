import { prisma } from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

import type {
  ProductCardData,
  ProductDetailsData,
  ProductListData,
} from "@/types/product";

type ProductFilters = {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
};

const PAGE_SIZE = 6;

export async function getProducts(
  filters: ProductFilters = {},
): Promise<ProductListData> {
  "use cache";

  cacheLife("hours");
  cacheTag("products");

  const { search, category, sort, page = 1 } = filters;

  const currentPage =
    Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1;

  const where = {
    isActive: true,

    ...(search && {
      OR: [
        {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),

    category: { isActive: true, ...(category ? { slug: category } : {}) },
  };

  const skip = (currentPage - 1) * PAGE_SIZE;

  const [products, totalItems] = await Promise.all([
    prisma.product.findMany({
      where,

      include: {
        category: true,
      },

      orderBy:
        sort === "price-asc"
          ? { price: "asc" }
          : sort === "price-desc"
            ? { price: "desc" }
            : { createdAt: "desc" },

      skip,
      take: PAGE_SIZE,
    }),

    prisma.product.count({
      where,
    }),
  ]);

  const items: ProductCardData[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    image: product.image,
    categoryName: product.category.name,
  }));

  return {
    items,
    page: currentPage,
    pageSize: PAGE_SIZE,
    totalItems,
    totalPages: Math.ceil(totalItems / PAGE_SIZE),
  };
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetailsData | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  const product = await prisma.product.findUnique({
    where: {
      slug,
    },

    include: {
      category: true,
    },
  });

  if (!product || !product.isActive || !product.category.isActive) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    image: product.image,

    stock: product.stock,

    categoryName: product.category.name,
  };
}
