import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import OrderStatusForm from "@/app/ui/order-status-form";
import { RefundAction, ReconcileRefundButton } from "@/app/ui/refund-action";
import { ORDER_TRANSITIONS } from "@/lib/order-status";

type AdminOrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function AdminOrderPage({ params }: AdminOrderPageProps) {
  return (
    <Suspense fallback={<section className="mx-auto max-w-3xl" role="status" aria-busy="true"><p className="text-gray-600">Loading order details…</p></section>}>
      <AdminOrderContent params={params} />
    </Suspense>
  );
}

async function AdminOrderContent({ params }: AdminOrderPageProps) {
  await requireAdmin();

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: {
      id,
    },
    include: {
      user: true,
      items: true,
      payment: {
        include: {
          refunds: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 10 },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold">Manage Order</h1>

      <p className="mt-2 text-gray-500">Order #{order.id}</p>
      {order.payment && (() => {
        const payment = order.payment;
        const amount = `${payment.currency} ${(Number(payment.amount) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
        const latestRefund = payment.refunds[0];
        const blockingRefund = payment.refunds.some((refund) =>
          refund.status === "REQUESTING" || refund.status === "PENDING" || refund.status === "UNKNOWN" || refund.status === "PROCESSED",
        );
        const canInitiateRefund = payment.status === "REFUND_REQUIRED" && Boolean(payment.gatewayPaymentId) && !blockingRefund;
        return (
          <div className="mt-4 rounded-lg border p-4">
            <h2 className="font-semibold">Payment</h2>
            <p className="mt-1">Status: {payment.status.replaceAll("_", " ")}</p>
            <p>Captured amount: {amount}</p>
            <p className="break-all">Razorpay payment ID: {payment.gatewayPaymentId ?? "Not available"}</p>
            {payment.status === "REFUND_REQUIRED" && <p className="mt-2 text-amber-800">This captured payment needs a full refund.</p>}

            <RefundAction orderId={order.id} amount={amount} enabled={canInitiateRefund} />

            {payment.refunds.length > 0 && (
              <div className="mt-5 border-t pt-4">
                <h3 className="font-semibold">Refund attempts</h3>
                <div className="mt-3 space-y-4">
                  {payment.refunds.map((refund) => (
                    <div key={refund.id} className="rounded border p-3 text-sm">
                      <p>Status: {refund.status.replaceAll("_", " ")}</p>
                      <p>Amount: {refund.currency} {(Number(refund.amount) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                      <p>Initiated: {refund.createdAt.toLocaleString("en-IN")}</p>
                      <p className="break-all">Razorpay refund ID: {refund.gatewayRefundId ?? "Awaiting confirmation"}</p>
                      <p className="break-all">Receipt: {refund.receipt}</p>
                      {refund.failureReason && <p className="mt-1 text-red-700">Reason: {refund.failureReason}</p>}
                      {refund.status === "REQUESTING" || refund.status === "PENDING" || refund.status === "UNKNOWN" ? (
                        <ReconcileRefundButton refundId={refund.id} />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {latestRefund?.status === "FAILED" && <p className="mt-3 text-amber-800">The last attempt failed. Verify the Razorpay state before creating another full refund attempt.</p>}
          </div>
        );
      })()}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-5">
          <h2 className="text-xl font-semibold">Customer</h2>

          <p className="mt-4">{order.fullName}</p>

          <p className="mt-1">{order.user.email}</p>

          <p className="mt-1">{order.phone}</p>
        </div>

        <div className="rounded-lg border p-5">
          <h2 className="text-xl font-semibold">Delivery Address</h2>

          <p className="mt-4">{order.addressLine}</p>

          <p>
            {order.city}, {order.state}
          </p>

          <p>{order.postalCode}</p>
        </div>
      </div>

      <div className="mt-8 rounded-lg border p-5">
        <h2 className="text-xl font-semibold">Order Items</h2>

        <div className="mt-4 space-y-4">
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

        <div className="mt-5 text-right text-xl font-bold">
          Total: ₹{Number(order.totalAmount).toLocaleString("en-IN")}
        </div>
      </div>

      <div className="mt-8 rounded-lg border p-5">
        {/* <p>
          <strong>Status:</strong> {order.status}
        </p> */}
        <div className="mt-8 rounded-lg border p-5">
          <h2 className="text-xl font-semibold">Order Status</h2>

          <p className="mt-3">Current status: {order.status}</p>
          <OrderStatusForm key={order.status} orderId={order.id} transitions={ORDER_TRANSITIONS[order.status]} />
        </div>
      </div>
    </section>
  );
}
