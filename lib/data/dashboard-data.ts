
import { prisma } from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

export async function getDashboardData() {
  "use cache";

  cacheLife("minutes");
  cacheTag(
    "dashboard-products",
    "dashboard-orders",
    "dashboard-external"
  );

  const [productCount, orderCount, externalData] =
    await Promise.all([
      prisma.product.count({
        where: { isActive: true },
      }),
      prisma.order.count(),
      getExternalData(),
    ]);

  return {
    productCount,
    orderCount,
    externalData,
  };
}

async function getExternalData() {
  const response = await fetch(
    "https://api.vercel.app/blog",
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch external dashboard data");
  }

  const posts = await response.json();

  return posts.slice(0, 5);
}
