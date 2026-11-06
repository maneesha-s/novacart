import Link from "next/link";
import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { toggleProductStatus } from "@/app/actions/product";

export const instant = false;

export default async function AdminProductsPage() {
  await requireAdmin();

  const products = await prisma.product.findMany({
    include: {
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Products</h1>

          <p className="mt-2 text-gray-600">
            Add, edit and manage NovaCart products.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Add Product
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {!products.length && <tr><td colSpan={6} className="p-6 text-center text-gray-600">No products yet.</td></tr>}
            {products.map((product) => (
              <tr key={product.id} className="border-b">
                <td className="p-3">{product.name}</td>

                <td className="p-3">{product.category.name}</td>

                <td className="p-3">
                  ₹{Number(product.price).toLocaleString("en-IN")}
                </td>

                <td className="p-3">{product.stock}</td>

                <td className="p-3">
                  {product.isActive ? "Active" : "Inactive"}
                </td>

                <td className="p-3">
                  <div className="flex gap-4">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="text-blue-600"
                    >
                      Edit
                    </Link>

                    <form action={toggleProductStatus.bind(null, product.id)}>
                      <button
                        type="submit"
                        className={
                          product.isActive ? "text-red-600" : "text-green-600"
                        }
                      >
                        {product.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </div>
                </td>
                {/* <td className="p-3">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="text-blue-600"
                  >
                    Edit
                  </Link>
                </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
