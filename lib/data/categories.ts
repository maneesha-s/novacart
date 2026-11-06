import { prisma } from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

export async function getCategoryOptions() {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  return prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getCategories() {
  "use cache";

  cacheLife("hours");
  cacheTag("categories");

  return prisma.category.findMany({
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },

    orderBy: {
      name: "asc",
    },
  });
}
