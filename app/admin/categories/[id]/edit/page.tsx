import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditCategoryForm from "./edit-category-form";

type EditCategoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCategoryPage({
  params,
}: EditCategoryPageProps) {
  await requireAdmin();

  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: {
      id,
    },
  });

  if (!category) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">Edit Category</h1>

      <p className="mt-2 text-gray-600">Update category details.</p>

      <EditCategoryForm
        category={{
          id: category.id,
          name: category.name,
          slug: category.slug,
        }}
      />
    </section>
  );
}
