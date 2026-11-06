
import { getDashboardData } from "@/lib/data/dashboard-data";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <main className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">
        Admin Dashboard
      </h1>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <article className="rounded-lg border p-4">
          <h2>Active Products</h2>
          <p className="text-2xl font-semibold">
            {data.productCount}
          </p>
        </article>

        <article className="rounded-lg border p-4">
          <h2>Total Orders</h2>
          <p className="text-2xl font-semibold">
            {data.orderCount}
          </p>
        </article>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">
          External Updates
        </h2>

        <ul className="space-y-2">
          {data.externalData.map(
            (post: { id: number; title: string }) => (
              <li key={post.id} className="rounded border p-3">
                {post.title}
              </li>
            )
          )}
        </ul>
      </section>
    </main>
  );
}
