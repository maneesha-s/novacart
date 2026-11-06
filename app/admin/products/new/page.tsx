import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import ProductForm from "./product-form";

export default async function NewProductPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold">Add Product</h1>

      <p className="mt-2 text-gray-600">Create a new NovaCart product.</p>

      <ProductForm
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
      />
    </section>
  );
}
