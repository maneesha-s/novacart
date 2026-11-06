"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ResourceId } from "@/lib/authorization";
import { redirect } from "next/navigation";
import { revalidatePath,updateTag } from "next/cache";

const ProductSchema = z.object({
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

  description: z
    .string()
    .trim()
    .max(10000)
    .min(10, "Description must be at least 10 characters"),

  price: z.coerce
    .number()
    .positive("Price must be greater than 0")
    .max(99999999.99)
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
      "Use at most two decimal places",
    ),

  stock: z.coerce
    .number()
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative")
    .max(1000000),

  categoryId: ResourceId,

  image: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) =>
        value === "" ||
        (/^\/[a-zA-Z0-9/_.-]+$/.test(value) && !value.includes("..")),
      "Use a local image path such as /products/product.jpg",
    )
    .optional(),
});


function invalidateProductCache(slug?: string) {
  // Cached product listing and product details
  updateTag("products");

  // Cached category and dashboard data
  updateTag("categories");
  updateTag("dashboard-products");
  updateTag("dashboard-external");

  // Public and admin routes
  revalidatePath("/products");
  revalidatePath("/wishlist");
  revalidatePath("/admin");
  revalidatePath("/admin/products");

  // Specific product page, if its slug is known
  if (slug) {
    revalidatePath(`/products/${slug}`);
  }
}

export type ProductFormState = {
  errors?: {
    name?: string[];
    slug?: string[];
    description?: string[];
    price?: string[];
    stock?: string[];
    categoryId?: string[];
    image?: string[];
  };

  message?: string;
};

export async function createProduct(
  previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = ProductSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    categoryId: formData.get("categoryId"),
    image: formData.get("image"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  if (
    !(await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
    }))
  )
    return { message: "Category not found." };

  const existingProduct = await prisma.product.findUnique({
    where: {
      slug: parsed.data.slug,
    },
  });

  if (existingProduct) {
    return {
      message: "A product with this slug already exists.",
    };
  }

  await prisma.product.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      price: parsed.data.price,
      stock: parsed.data.stock,
      categoryId: parsed.data.categoryId,
      image: parsed.data.image || null,
    },
  });

  invalidateProductCache(parsed.data.slug);
// revalidatePath("/products");
// revalidatePath("/admin");
// revalidatePath("/wishlist");
// revalidatePath("/admin/products");

// updateTag("dashboard-products");
// updateTag("dashboard-external");
// updateTag("products");
// updateTag("categories");

redirect("/admin/products");
}

export async function updateProduct(
  productId: string,
  previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = ProductSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    categoryId: formData.get("categoryId"),
    image: formData.get("image"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!ResourceId.safeParse(productId).success)
    return { message: "Invalid product." };
  if (!(await prisma.product.findUnique({ where: { id: productId } })))
    return { message: "Product not found." };

  if (
    !(await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
    }))
  )
    return { message: "Category not found." };

  const existingProduct = await prisma.product.findUnique({
  where: { id: productId },
  select: { slug: true },
  });
 
  const duplicateSlug = await prisma.product.findFirst({
    where: {
      slug: parsed.data.slug,
      NOT: {
        id: productId,
      },
    },
  });

  if (duplicateSlug) {
    return {
      message: "Another product already uses this slug.",
    };
  }

  const product = await prisma.product.update({
    where: {
      id: productId,
    },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      price: parsed.data.price,
      stock: parsed.data.stock,
      categoryId: parsed.data.categoryId,
      image: parsed.data.image || null,
    },
  });
  invalidateProductCache(existingProduct?.slug);
  invalidateProductCache(product.slug);
  // revalidatePath("/admin");
  // revalidatePath("/wishlist");
  // revalidatePath("/admin/products");
  // revalidatePath("/products");

  // revalidatePath(`/products/${product.slug}`);

  // updateTag("products");
  // updateTag("categories");

  redirect("/admin/products");
}

export async function toggleProductStatus(productId: string) {
  ResourceId.parse(productId);
  await requireAdmin();

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    return;
  }

  await prisma.product.update({
    where: {
      id: productId,
    },
    data: {
      isActive: !product.isActive,
    },
  });

  // revalidatePath("/admin");
  // revalidatePath("/wishlist");
  // revalidatePath("/admin/products");
  // revalidatePath("/products");
  // revalidatePath("/products/[slug]", "page");
  invalidateProductCache(product.slug);

  updateTag("products");
  updateTag("categories");
}
