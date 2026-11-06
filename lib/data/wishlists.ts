import { prisma } from "@/lib/prisma";

export async function getWishlist(userId: string) {
  return prisma.wishlistItem.findMany({
    where: {
      userId,
    },

    include: {
      product: {
        include: {
          category: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function isWishlisted(userId: string, productId: string) {
  const item = await prisma.wishlistItem.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },

    select: {
      productId: true,
    },
  });

  return Boolean(item);
}
