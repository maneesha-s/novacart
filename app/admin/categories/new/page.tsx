import { requireAdmin } from "@/lib/authorization";
import CategoryForm from "./category-form";

export default async function NewCategoryPage() {
  await requireAdmin();

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">
        Add Category
      </h1>

      <p className="mt-2 text-gray-600">
        Create a new product category.
      </p>

      <CategoryForm />
    </section>
  );
}