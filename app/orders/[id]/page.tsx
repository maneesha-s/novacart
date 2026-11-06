import CancelOrderForm from "@/app/ui/cancel-order-form";
import { requireUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import RetryPaymentButton from "@/app/ui/retry-payment-button";
import Link from "next/link";
import PaymentExpiryCheck from "@/app/ui/payment-expiry-check";

export const instant = false;

type OrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrderPage({ params }: OrderPageProps) {
  const user = await requireUser();

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: {
      id,
      userId: user.id,
    },

    include: {
      items: true,
      payment: true,
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold">Order Details</h1>

      <p className="mt-2 text-gray-600">Order ID: {order.id}</p>
      <p className="mt-2">Status: {order.status}</p>
      {order.payment && <p className="mt-2">Payment: {order.payment.status.replaceAll("_", " ")}</p>}
      {order.status === "PENDING" && order.payment?.status === "PENDING" && order.payment.expiresAt <= new Date() && <PaymentExpiryCheck orderId={order.id} />}
      {order.payment?.status === "PENDING" && order.status === "PENDING" && <RetryPaymentButton orderId={order.id} />}
      {order.payment?.status === "REFUND_REQUIRED" && <p className="mt-2 text-amber-800">Your order was cancelled. The refund is awaiting processing.</p>}
      {order.payment?.status === "REFUNDED" && <p className="mt-2 text-emerald-800">Refund processed.</p>}
      {["PENDING", "CONFIRMED"].includes(order.status) && <CancelOrderForm orderId={order.id} />}

      {order.payment?.status === "EXPIRED" && (
  <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
    <h2 className="font-semibold text-amber-900">
      Payment expired
    </h2>

    <p className="mt-1 text-sm text-amber-800">
      Your payment window has expired and this order has been cancelled.
      The reserved stock has been released. Please return to your cart
      and place a new order.
    </p>

    <Link
      href="/cart"
      className="mt-3 inline-block rounded-md bg-black px-4 py-2 text-white"
    >
      Return to Cart
    </Link>
  </div>
)}

      <div className="mt-8 space-y-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between border-b pb-3">
            <span>
              {item.productName} × {item.quantity}
            </span>

            <span>
              ₹{(Number(item.price) * item.quantity).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6 text-right text-xl font-bold">
        Total: ₹{Number(order.totalAmount).toLocaleString("en-IN")}
      </p>
    </section>
  );
}
