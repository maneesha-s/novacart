import { prisma } from "@/lib/prisma";

export type ExpiryResult = {
  expired: boolean;
  stockRestored: boolean;
  reason: "expired" | "not-found" | "not-due" | "already-processed" | "order-not-pending";
};

/** Expires one reservation atomically; safe to call from retry, webhook and cron paths. */
export async function expirePendingPayment(orderId: string): Promise<ExpiryResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const payment = await tx.payment.findUnique({
      where: { orderId },
      include: { order: { include: { items: true } } },
    });
    if (!payment) return { expired: false, stockRestored: false, reason: "not-found" };
    if (payment.status !== "PENDING") return { expired: false, stockRestored: false, reason: "already-processed" };
    if (payment.expiresAt > new Date()) return { expired: false, stockRestored: false, reason: "not-due" };

    if (payment.order.status === "CANCELLED") {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "EXPIRED" } });
      return { expired: true, stockRestored: false, reason: "expired" };
    }
    if (payment.order.status !== "PENDING") {
      return { expired: false, stockRestored: false, reason: "order-not-pending" };
    }

    const cancelled = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    if (cancelled.count !== 1) return { expired: false, stockRestored: false, reason: "order-not-pending" };

    const expired = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    if (expired.count !== 1) throw new Error("Payment expiry lost its locked state.");

    for (const item of [...payment.order.items].sort((a, b) => a.productId.localeCompare(b.productId))) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    return { expired: true, stockRestored: true, reason: "expired" };
  });
}
