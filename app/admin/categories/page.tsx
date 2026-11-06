import Link from "next/link";
import { Suspense } from "react";

import { requireAdmin } from "@/lib/authorization";
import { deleteCategory, setCategoryStatus } from "@/app/actions/category";
import { getCategories } from "@/lib/data/categories";
// import { getCategories } from "@/lib/data/categories";

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesLoading />}>
      <CategoriesContent />
    </Suspense>
  );
}

async function CategoriesContent() {
  await requireAdmin();

  const categories = await getCategories();

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>

          <p className="mt-2 text-gray-600">Manage product categories.</p>
        </div>

        <Link
          href="/admin/categories/new"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Add Category
        </Link>
      </div>

      <div className="mt-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Products</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {!categories.length && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-600">
                  No categories yet.
                </td>
              </tr>
            )}

            {categories.map((category) => (
              <tr key={category.id} className="border-b">
                <td className="p-3">{category.name}</td>

                <td className="p-3">{category.slug}</td>

                <td className="p-3">{category._count.products}</td>

                <td className="p-3">{category.isActive ? "Active" : "Inactive"}</td>
                <td className="p-3">
                  <div className="flex gap-4">
                    <form action={setCategoryStatus}><input type="hidden" name="id" value={category.id} /><input type="hidden" name="isActive" value={String(!category.isActive)} /><button className="underline">{category.isActive ? "Deactivate" : "Activate"}</button></form>
                    <Link
                      href={`/admin/categories/${category.id}/edit`}
                      className="text-blue-600"
                    >
                      Edit
                    </Link>

                    {category._count.products === 0 && (
                      <form action={deleteCategory.bind(null, category.id)}>
                        <button type="submit" className="text-red-600">
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CategoriesLoading() {
  return (
    <section>
      <h1 className="text-3xl font-bold">Categories</h1>

      <p className="mt-4 text-gray-600">Loading categories...</p>
    </section>
  );
}
