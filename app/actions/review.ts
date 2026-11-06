"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, ResourceId } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
export type ReviewState = { message?: string; success?: boolean };
const ReviewSchema = z.object({ productId: ResourceId, rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().min(5).max(2000) });
export async function saveReview(previous: ReviewState, formData: FormData): Promise<ReviewState> {
  const user = await requireUser();
  const parsed = ReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Choose a rating from 1 to 5 and write 5–2000 characters." };
  const { productId, rating, comment } = parsed.data;
  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true, category: { isActive: true } } });
  if (!product) return { message: "Product unavailable." };
  await prisma.review.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    create: { userId: user.id, productId, rating, comment }, update: { rating, comment },
  });
  revalidatePath(`/products/${product.slug}`);
  return { success: true, message: "Review saved." };
}
export async function deleteReview(formData: FormData) {
  const user = await requireUser();
  const productId = ResourceId.parse(formData.get("productId"));
  await prisma.review.deleteMany({ where: { userId: user.id, productId } });
  revalidatePath("/products/[slug]", "page");
}
