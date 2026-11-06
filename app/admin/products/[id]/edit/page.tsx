import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditProductForm from "./edit-product-form";
import { getCategoryOptions } from "@/lib/data/categories";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  await requireAdmin();

  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: {
        id,
      },
    }),

    getCategoryOptions(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold">Edit Product</h1>

      <p className="mt-2 text-gray-600">Update product information.</p>

      <EditProductForm
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: Number(product.price),
          stock: product.stock,
          categoryId: product.categoryId,
          image: product.image ?? "",
        }}
        categories={categories}
      />
    </section>
  );
}
