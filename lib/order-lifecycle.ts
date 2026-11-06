import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/app/generated/prisma/client";
import { canTransition } from "@/lib/order-status";

// Conditional update claims the transition before restoring stock. Concurrent
// requests cannot cancel twice or overwrite a newer shipping status.
export async function transitionOrder(
  orderId: string,
  next: OrderStatus,
  userId?: string,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findFirst({
      where: { id: orderId, ...(userId ? { userId } : {}) },
      include: { items: true, payment: true },
    });
    if (!order) return { message: "Order not found." };
    if (!canTransition(order.status, next))
      return { message: "This order status change is no longer allowed." };
    if (next !== "CANCELLED" && order.payment && order.payment.status !== "PAID")
      return { message: "Online payment must be captured before this order can advance." };
    const changed = await tx.order.updateMany({
      where: {
        id: order.id,
        status: order.status,
        ...(userId ? { userId } : {}),
      },
      data: { status: next },
    });
    if (changed.count !== 1)
      return { message: "The order changed. Refresh and try again." };
    if (next === "CANCELLED") {
      if (order.payment?.status === "PAID") {
        await tx.payment.update({ where: { orderId }, data: { status: "REFUND_REQUIRED" } });
      } else if (order.payment?.status === "PENDING") {
        await tx.payment.update({ where: { orderId }, data: { status: "EXPIRED" } });
      }
      for (const item of order.items) {
        // Soft-disabled products still receive their stock back. A missing
        // product aborts the transaction instead of silently losing stock.
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
    return {
      success: true,
      message:
        next === "CANCELLED"
          ? order.payment?.status === "PAID" ? "Order cancelled and stock restored. A refund needs processing." : "Order cancelled and stock restored."
          : "Order status updated.",
    };
  });
}
