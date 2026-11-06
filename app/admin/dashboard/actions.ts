
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProductPrice(
  productId: string,
  price: number
) {
  // Production: authenticate and authorize the admin here.
  // Validate productId and price on the server.

  if (!productId || !Number.isFinite(price) || price < 0) {
    throw new Error("Invalid product or price");
  }

  await prisma.product.update({
    where: { id: productId },
    data: { price },
  });

  revalidatePath("/admin/dashboard");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
}
