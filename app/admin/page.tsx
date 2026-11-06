import Link from "next/link";
import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  await requireAdmin();
  const [products, activeProducts, categories, customers, orders, revenue, statusCounts, lowStock, recentOrders] = await prisma.$transaction(async tx => Promise.all([
    tx.product.count(),
    tx.product.count({ where: { isActive: true } }),
    tx.category.count(),
    tx.user.count({ where: { role: "CUSTOMER", isActive: true } }),
    tx.order.count(),
    tx.order.aggregate({ where: { status: "DELIVERED" }, _sum: { totalAmount: true } }),
    tx.order.groupBy({ by: ["status"], orderBy: { status: "asc" }, _count: { _all: true } }),
    tx.product.findMany({ where: { isActive: true, stock: { lte: 5 } }, select: { id: true, name: true, stock: true }, orderBy: { stock: "asc" }, take: 10 }),
    tx.order.findMany({ select: { id: true, status: true, totalAmount: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]), { isolationLevel: "RepeatableRead" });
  const metrics = [
    ["Products", products], ["Active products", activeProducts], ["Categories", categories],
    ["Active customers", customers], ["Orders", orders],
    ["Delivered order revenue", `₹${Number(revenue._sum.totalAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
  ];

  return (
    <section>
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <p className="mt-3 text-gray-600">Manage NovaCart. Revenue is the value of delivered orders.</p>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{metrics.map(([label, value]) => <div key={label} className="rounded-xl border p-5"><dt className="text-gray-600">{label}</dt><dd className="mt-2 text-2xl font-bold">{value}</dd></div>)}</dl>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border p-5"><h2 className="text-xl font-semibold">Orders by status</h2>{statusCounts.length ? statusCounts.map(row => <p key={row.status} className="mt-2">{row.status}: {row._count._all}</p>) : <p className="mt-3">No orders yet.</p>}</div>
        <div className="rounded-xl border p-5"><h2 className="text-xl font-semibold">Low stock (5 or fewer)</h2>{lowStock.length ? lowStock.map(product => <p key={product.id} className="mt-2"><Link href={`/admin/products/${product.id}/edit`} className="underline">{product.name}</Link>: {product.stock}</p>) : <p className="mt-3">No active products need restocking.</p>}</div>
      </div>
      <div className="mt-8 rounded-xl border p-5"><h2 className="text-xl font-semibold">Recent orders</h2>{recentOrders.length ? recentOrders.map(order => <p key={order.id} className="mt-3"><Link href={`/admin/orders/${order.id}`} className="underline">#{order.id.slice(0, 8)}</Link> · {order.status} · ₹{Number(order.totalAmount).toLocaleString("en-IN")}</p>) : <p className="mt-3">No orders yet.</p>}</div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/products" className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">Products</h2>

          <p className="mt-2 text-gray-600">Add and manage products.</p>
        </Link>

        <Link href="/admin/categories" className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">Categories</h2>

          <p className="mt-2 text-gray-600">Manage product categories.</p>
        </Link>

        <Link href="/admin/orders" className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">Orders</h2>

          <p className="mt-2 text-gray-600">View and manage customer orders.</p>
        </Link>
      </div>
    </section>
  );
}
