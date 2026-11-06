"use server";

import { z } from "zod";
import { requireAdmin, ResourceId } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";

const CategorySchema = z.object({
  name: z.string().trim().max(100).min(2, "Name must be at least 2 characters"),

  slug: z
    .string()
    .trim()
    .max(160)
    .min(2, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers, and hyphens only",
    ),
});

export type CategoryFormState = {
  errors?: {
    name?: string[];
    slug?: string[];
  };

  message?: string;
};

export async function createCategory(
  previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();

  const parsed = CategorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await prisma.category.findFirst({
    where: {
      OR: [{ name: parsed.data.name }, { slug: parsed.data.slug }],
    },
  });

  if (existing) {
    return {
      message: "Category name or slug already exists.",
    };
  }

  await prisma.category.create({
    data: parsed.data,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  updateTag("categories");
  updateTag("products");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/wishlist");
  redirect("/admin/categories");
}
export async function updateCategory(
  categoryId: string,
  previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();

  const parsed = CategorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!ResourceId.safeParse(categoryId).success)
    return { message: "Invalid category." };
  if (!(await prisma.category.findUnique({ where: { id: categoryId } })))
    return { message: "Category not found." };

  const duplicate = await prisma.category.findFirst({
    where: {
      OR: [{ name: parsed.data.name }, { slug: parsed.data.slug }],
      NOT: {
        id: categoryId,
      },
    },
  });

  if (duplicate) {
    return {
      message: "Another category already uses this name or slug.",
    };
  }

  await prisma.category.update({
    where: {
      id: categoryId,
    },
    data: parsed.data,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  updateTag("categories");
  updateTag("products");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/wishlist");
  redirect("/admin/categories");
}
export async function deleteCategory(categoryId: string) {
  ResourceId.parse(categoryId);
  await requireAdmin();

  // A single conditional deletion avoids a count/delete race.
  await prisma.category.deleteMany({
    where: { id: categoryId, products: { none: {} } },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  updateTag("categories");
  updateTag("products");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/wishlist");
}


export async function setCategoryStatus(formData: FormData) {
  await requireAdmin();
  const { id, isActive } = z.object({
    id: ResourceId,
    isActive: z.enum(["true", "false"]).transform(value => value === "true"),
  }).parse(Object.fromEntries(formData));
  await prisma.category.update({ where: { id }, data: { isActive } });
  updateTag("categories");
  updateTag("products");
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/wishlist");
}
