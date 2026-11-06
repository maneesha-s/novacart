"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getRazorpay } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ResourceId } from "@/lib/authorization";
import { initiateFullRefund, reconcileRefund, type RefundGateway, type RefundMutationResult } from "@/lib/refund-service";

export type RefundActionState = RefundMutationResult;

const InitiateRefundInput = z.object({
  orderId: ResourceId,
  confirmation: z.literal("yes"),
});

const ReconcileRefundInput = z.object({ refundId: ResourceId });

export async function initiateRefund(
  orderId: string,
  previous: RefundActionState,
  formData: FormData,
): Promise<RefundActionState> {
  const admin = await requireAdmin();
  void previous;
  const parsed = InitiateRefundInput.safeParse({ orderId, confirmation: formData.get("confirmRefund") });
  if (!parsed.success) return { success: false, message: "Confirm the full refund and try again." };

  try {
    const gateway = getRazorpay().client as unknown as RefundGateway;
    const result = await initiateFullRefund(parsed.data.orderId, admin, gateway);
    if (result.refundId) {
      revalidatePath(`/admin/orders/${parsed.data.orderId}`);
      revalidatePath("/admin/orders");
      revalidatePath(`/orders/${parsed.data.orderId}`);
    }
    return result;
  } catch {
    console.error(JSON.stringify({ level: "error", event: "razorpay.refund.action_failed", orderId: parsed.data.orderId }));
    return { success: false, message: "The refund could not be started. Check the payment and try again." };
  }
}

export async function reconcileRefundAction(
  refundId: string,
  previous: RefundActionState,
  formData: FormData,
): Promise<RefundActionState> {
  const admin = await requireAdmin();
  void previous;
  void formData;
  const parsed = ReconcileRefundInput.safeParse({ refundId });
  if (!parsed.success) return { success: false, message: "Invalid refund attempt." };
  const attempt = await prisma.refund.findUnique({
    where: { id: parsed.data.refundId },
    select: { payment: { select: { orderId: true } } },
  });
  if (!attempt) return { success: false, message: "Refund attempt not found." };

  try {
    const gateway = getRazorpay().client as unknown as RefundGateway;
    const result = await reconcileRefund(parsed.data.refundId, admin, gateway);
    revalidatePath(`/admin/orders/${attempt.payment.orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath(`/orders/${attempt.payment.orderId}`);
    return result;
  } catch {
    console.error(JSON.stringify({ level: "error", event: "razorpay.refund.reconcile_action_failed", refundId: parsed.data.refundId }));
    return { success: false, message: "Unable to check refund status right now." };
  }
}
