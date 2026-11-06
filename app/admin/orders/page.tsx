import Link from "next/link";
import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function AdminOrdersPage() {
  await requireAdmin();

  const orders = await prisma.order.findMany({
    include: {
      user: true,
      payment: { select: { status: true } },
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <section>
      <h1 className="text-3xl font-bold">Manage Orders</h1>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Items</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {!orders.length && <tr><td colSpan={7} className="p-6 text-center text-gray-600">No orders yet.</td></tr>}
            {orders.map((order) => (
              <tr key={order.id} className="border-b">
                <td className="p-3">#{order.id.slice(0, 8)}</td>

                <td className="p-3">{order.user.email}</td>

                <td className="p-3">{order._count.items}</td>

                <td className="p-3">
                  ₹{Number(order.totalAmount).toLocaleString("en-IN")}
                </td>

                <td className="p-3">{order.status}</td>
                <td className={`p-3 ${order.payment?.status === "REFUND_REQUIRED" ? "font-semibold text-amber-800" : ""}`}>{order.payment?.status.replaceAll("_", " ") ?? "—"}</td>

                <td className="p-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-blue-600"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
