"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, ResourceId } from "@/lib/authorization";
import { revalidatePath } from "next/cache";

export async function setWishlist(formData: FormData) {
  const user = await requireUser();
  const { productId, intent } = z.object({
    productId: ResourceId,
    intent: z.enum(["save", "remove"]),
  }).parse(Object.fromEntries(formData));
  if (intent === "remove") {
    await prisma.wishlistItem.deleteMany({ where: { userId: user.id, productId } });
  } else {
    const product = await prisma.product.findFirst({ where: { id: productId, isActive: true, category: { isActive: true } } });
    if (!product) throw new Error("Product unavailable.");
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      create: { userId: user.id, productId }, update: {},
    });
  }
  revalidatePath("/wishlist");
  revalidatePath("/products/[slug]", "page");
}
