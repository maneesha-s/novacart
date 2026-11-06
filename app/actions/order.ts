"use server";
import { revalidatePath, updateTag } from "next/cache";
import { requireUser } from "@/lib/authorization";
import { CheckoutSchema } from "@/lib/validation";
import { createCheckoutOrder, CheckoutError } from "@/lib/checkout";
import { getOrCreateRazorpayOrder } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { transitionOrder } from "@/lib/order-lifecycle";

export type CheckoutState = { success?: boolean; message?: string; orderId?: string; razorpayOrderId?: string; amount?: number; currency?: string; keyId?: string };

export async function placeOrder(_previous: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await requireUser();
  const rawItems = formData.get("items");
  if (typeof rawItems !== "string" || rawItems.length > 20000) return { message: "Invalid cart data." };
  let items: unknown;
  try { items = JSON.parse(rawItems); } catch { return { message: "Invalid cart data." }; }
  const saveAddress = formData.get("saveAddress");
  if (saveAddress !== null && saveAddress !== "true" && saveAddress !== "false") return { message: "Invalid address preference." };
  const parsed = CheckoutSchema.safeParse({ ...Object.fromEntries(formData), items, saveAddress: saveAddress === "true" });
  const key = formData.get("checkoutKey");
  if (!parsed.success || typeof key !== "string" || !zodUuid(key)) return { message: "Please check your address and cart, then try again." };
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return { message: "Online payment is not configured. Please try again later." };

  let orderId: string | undefined;
  try {
    const existing = await prisma.order.findFirst({ where: { checkoutKey: key, userId: user.id }, include: { payment: true } });
    if (existing) {
      if (!existing.payment || existing.payment.status !== "PENDING" || existing.payment.expiresAt <= new Date()) return { message: "This checkout expired. Reload the checkout page to start again." };
      orderId = existing.id;
    } else {
      const order = await createCheckoutOrder(user.id, parsed.data, key);
      orderId = order.id;
    }
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });
    let gatewayOrderId = payment.gatewayOrderId;
    if (!gatewayOrderId) {
      const gatewayOrder = await getOrCreateRazorpayOrder({ orderId, amount: payment.amount, currency: payment.currency });
      gatewayOrderId = gatewayOrder.id;
      await prisma.payment.updateMany({ where: { orderId, status: "PENDING", gatewayOrderId: null }, data: { gatewayOrderId } });
      const saved = await prisma.payment.findUniqueOrThrow({ where: { orderId } });
      gatewayOrderId = saved.gatewayOrderId;
    }
    if (!gatewayOrderId) throw new Error("Could not initialize payment.");
    const refreshedPayment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });
    if (refreshedPayment.status !== "PENDING" || refreshedPayment.expiresAt <= new Date()) {
      await transitionOrder(orderId, "CANCELLED", user.id);
      updateTag("products");
      return { success: false, message: "The payment reservation expired during setup. Please start checkout again." };
    }
    console.info(JSON.stringify({ level: "info", event: "razorpay.payment.initiated", orderId }));
    updateTag("products");
    for (const path of ["/orders", "/admin", "/admin/orders", "/admin/products", "/products", "/account/addresses", "/checkout"]) revalidatePath(path);
    revalidatePath("/products/[slug]", "page");
    return { success: true, message: "Continue to secure payment.", orderId, razorpayOrderId: gatewayOrderId, amount: Number(payment.amount), currency: payment.currency, keyId: process.env.RAZORPAY_KEY_ID };
  } catch (error) {
    if (orderId) {
      const cancellation = await transitionOrder(orderId, "CANCELLED", user.id).catch(() => ({ success: false }));
      if (cancellation.success) updateTag("products");
    }
    console.error(JSON.stringify({ level: "error", event: "razorpay.payment.initiation_failed", orderId: orderId ?? "uncreated", code: typeof error === "object" && error !== null && "code" in error ? error.code : "INITIATION_ERROR" }));
    return { success: false, message: error instanceof CheckoutError ? error.message : error instanceof Error ? error.message : "Unable to start checkout. Please try again." };
  }
}

function zodUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
