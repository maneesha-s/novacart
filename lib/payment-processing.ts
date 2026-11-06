import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";
import { expirePendingPayment } from "@/lib/payment-expiry";
import { revalidateTag } from "next/cache";

export function verifySignature(value: string, signature: string, secret: string) {
  if (!/^[a-f\d]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(value).digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Fetch the gateway's authoritative state before applying a payment exactly once. */
export async function processCapturedPayment(gatewayOrderId: string, paymentId: string, eventId?: string) {
  const { client } = getRazorpay();
  const remote = await client.payments.fetch(paymentId);
  if (remote.order_id !== gatewayOrderId || remote.status !== "captured") {
    throw new Error("Payment is not captured for this Razorpay order.");
  }

  const initial = await prisma.payment.findUnique({
    where: { gatewayOrderId },
    select: { id: true, orderId: true, status: true, expiresAt: true, amount: true, currency: true, gatewayPaymentId: true },
  });
  if (!initial) throw new Error("Payment order not found.");
  if (BigInt(remote.amount) !== initial.amount || remote.currency !== initial.currency) {
    throw new Error("Captured payment amount does not match the order.");
  }

  if (initial.status === "PENDING" && initial.expiresAt <= new Date()) {
    const expiry = await expirePendingPayment(initial.orderId);
    if (expiry.stockRestored) revalidateTag("products", "max");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${initial.orderId} FOR UPDATE`;
    const payment = await tx.payment.findUnique({
      where: { gatewayOrderId },
      include: { order: { include: { items: true } } },
    });
    if (!payment) throw new Error("Payment order not found.");
    if (payment.amount !== BigInt(remote.amount) || payment.currency !== remote.currency) {
      throw new Error("Captured payment amount does not match the order.");
    }

    if (eventId) {
      await tx.webhookEvent.create({
        data: { eventId, eventType: "payment.captured", processedAt: new Date() },
      });
    }

    if (payment.status === "PAID") {
      if (payment.gatewayPaymentId !== paymentId) {
        throw new Error("A different payment has already been recorded for this order.");
      }
      return { status: "PAID" as const, late: false };
    }
    if (payment.status === "REFUNDED" || payment.status === "REFUND_REQUIRED") {
      if (payment.gatewayPaymentId && payment.gatewayPaymentId !== paymentId) {
        throw new Error("A different payment is already associated with this refund.");
      }
      if (!payment.gatewayPaymentId) {
        await tx.payment.update({ where: { id: payment.id }, data: { gatewayPaymentId: paymentId } });
      }
      return { status: payment.status, late: false };
    }

    const isLate = payment.status === "EXPIRED" || payment.expiresAt <= new Date() || payment.order.status !== "PENDING";
    if (isLate) {
      if (payment.order.status === "PENDING") {
        // An expired payment should already have been cancelled atomically. Keep
        // the order pending only if an invariant was broken; never restock twice.
        throw new Error("Expired payment still has a pending order; manual reconciliation is required.");
      }
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "REFUND_REQUIRED", gatewayPaymentId: paymentId },
      });
      return { status: "REFUND_REQUIRED" as const, late: true };
    }

    await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", gatewayPaymentId: paymentId } });
    await tx.order.update({ where: { id: payment.orderId, status: "PENDING" }, data: { status: "CONFIRMED" } });
    return { status: "PAID" as const, late: false };
  });

  if (result.late) revalidateTag("products", "max");
  return { status: result.status };
}

export async function expirePendingPayments() {
  const candidates = await prisma.payment.findMany({
    where: { status: "PENDING", expiresAt: { lte: new Date() } },
    select: { orderId: true },
    take: 250,
  });
  let expired = 0;
  let stockRestored = false;
  for (const { orderId } of candidates) {
    const result = await expirePendingPayment(orderId);
    if (result.expired) expired++;
    if (result.stockRestored) stockRestored = true;
  }
  if (stockRestored) revalidateTag("products", "max");
  return expired;
}
