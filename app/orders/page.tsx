import Link from "next/link";
import { requireUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function OrdersPage() {
  const user = await requireUser();

  const orders = await prisma.order.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  return (
    <section>
      <h1 className="text-3xl font-bold">My Orders</h1>

      {orders.length === 0 ? (
        <p className="mt-6 text-gray-600">
          You haven&apos;t placed any orders yet.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    Order #{order.id.slice(0, 8)}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {order.createdAt.toLocaleDateString()}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold">
                    ₹{Number(order.totalAmount).toLocaleString("en-IN")}
                  </p>

                  <p className="text-sm text-gray-500">
                    {order.status}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {order._count.items} item(s)
                </span>

                <Link
                  href={`/orders/${order.id}`}
                  className="text-blue-600"
                >
                  View Order
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}