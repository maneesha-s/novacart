"use server";
import { requireUser, ResourceId } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { getOrCreateRazorpayOrder } from "@/lib/razorpay";
import { expirePendingPayment } from "@/lib/payment-expiry";
import { updateTag } from "next/cache";

export async function getPaymentRetry(orderId: string) {
  const user = await requireUser();
  const parsed = ResourceId.safeParse(orderId);
  if (!parsed.success) return { message: "Invalid order." };

  const ownedOrder = await prisma.order.findFirst({ where: { id: parsed.data, userId: user.id }, select: { id: true } });
  if (!ownedOrder) return { message: "Order not found." };

  const expiry = await expirePendingPayment(ownedOrder.id);
  if (expiry.stockRestored) updateTag("products");
  if (expiry.expired) return { expired: true as const, message: "This payment reservation expired. Return to your cart and place a new order." };

  const payment = await prisma.payment.findFirst({
    where: { orderId: ownedOrder.id, status: "PENDING", order: { status: "PENDING", userId: user.id } },
  });
  if (!payment) return { message: "This payment is no longer available." };
  if (payment.expiresAt <= new Date()) {
    const lateExpiry = await expirePendingPayment(ownedOrder.id);
    if (lateExpiry.stockRestored) updateTag("products");
    return { expired: true as const, message: "This payment reservation expired. Return to your cart and place a new order." };
  }
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return { message: "Online payment is not configured. Please try again later." };
  }

  try {
    let gatewayOrderId = payment.gatewayOrderId;
    if (!gatewayOrderId) {
      const remote = await getOrCreateRazorpayOrder({ orderId: payment.orderId, amount: payment.amount, currency: payment.currency });
      await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING", gatewayOrderId: null, expiresAt: { gt: new Date() } }, data: { gatewayOrderId: remote.id } });
      const refreshed = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      if (refreshed.status !== "PENDING" || refreshed.expiresAt <= new Date()) {
        const lateExpiry = await expirePendingPayment(ownedOrder.id);
        if (lateExpiry.stockRestored) updateTag("products");
        return { expired: true as const, message: "This payment reservation expired. Return to your cart and place a new order." };
      }
      gatewayOrderId = refreshed.gatewayOrderId;
    }
    if (!gatewayOrderId) return { message: "Payment setup is still processing. Please try again shortly." };
    return { success: true as const, keyId: process.env.RAZORPAY_KEY_ID, gatewayOrderId, amount: Number(payment.amount), currency: payment.currency };
  } catch {
    console.error(JSON.stringify({ level: "error", event: "razorpay.payment.retry_initialization_failed", orderId: ownedOrder.id }));
    return { message: "Unable to start payment right now. Please try again." };
  }
}

/** Called when an authenticated customer opens an order whose deadline has passed. */
export async function checkOrderPaymentExpiry(orderId: string) {
  const user = await requireUser();
  const parsed = ResourceId.safeParse(orderId);
  if (!parsed.success) return { expired: false };
  const order = await prisma.order.findFirst({
    where: { id: parsed.data, userId: user.id },
    select: { id: true, status: true, payment: { select: { status: true, expiresAt: true } } },
  });
  if (!order) return { expired: false };
  if (order.payment?.status === "EXPIRED") return { expired: true };
  if (order.status !== "PENDING" || order.payment?.status !== "PENDING" || order.payment.expiresAt > new Date()) return { expired: false };
  const result = await expirePendingPayment(order.id);
  if (result.stockRestored) updateTag("products");
  return { expired: result.expired };
}
