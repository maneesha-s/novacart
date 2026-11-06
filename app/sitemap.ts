import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      updatedAt: true,
    },
  });

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...products.map((product) => ({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
// import type { MetadataRoute } from "next";
// import { prisma } from "@/lib/prisma";

// export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
//   const siteUrl =
//     process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

//   const [products, categories] = await Promise.all([
//     prisma.product.findMany({
//       where: { isActive: true },
//       select: {
//         slug: true,
//         updatedAt: true,
//       },
//     }),

//     prisma.category.findMany({
//       where: { isActive: true },
//       select: {
//         slug: true,
//         updatedAt: true,
//       },
//     }),
//   ]);

//   const staticPages: MetadataRoute.Sitemap = [
//     {
//       url: siteUrl,
//       lastModified: new Date(),
//       changeFrequency: "daily",
//       priority: 1,
//     },
//     {
//       url: `${siteUrl}/products`,
//       lastModified: new Date(),
//       changeFrequency: "daily",
//       priority: 0.9,
//     },
//   ];

//   const productPages: MetadataRoute.Sitemap = products.map((product) => ({
//     url: `${siteUrl}/products/${product.slug}`,
//     lastModified: product.updatedAt,
//     changeFrequency: "weekly",
//     priority: 0.8,
//   }));

//   const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
//     url: `${siteUrl}/categories/${category.slug}`,
//     lastModified: category.updatedAt,
//     changeFrequency: "weekly",
//     priority: 0.7,
//   }));

//   return [...staticPages, ...productPages, ...categoryPages];
// }