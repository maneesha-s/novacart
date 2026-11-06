import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma, type RefundStatus, type UserRole } from "@/app/generated/prisma/client";

export type RazorpayPaymentSnapshot = {
  id: string;
  order_id: string | null;
  status: string;
  amount: number;
  amount_refunded?: number;
  currency: string;
};

export type RazorpayRefundSnapshot = {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  receipt?: string | null;
  notes?: Record<string, unknown> | null;
  status: string;
  error_description?: string | null;
  created_at?: number;
};

export type RefundGateway = {
  payments: {
    fetch(paymentId: string): Promise<RazorpayPaymentSnapshot>;
    refund(paymentId: string, body: { amount: number; receipt: string; notes: Record<string, string> }): Promise<RazorpayRefundSnapshot>;
    fetchMultipleRefund(paymentId: string, options: { count: number; skip: number }): Promise<{ items: RazorpayRefundSnapshot[] }>;
  };
};

export type RefundMutationResult = {
  success: boolean;
  status?: RefundStatus;
  message: string;
  refundId?: string;
};

type RefundWithPayment = Prisma.RefundGetPayload<{ include: { payment: true } }>;

function safeErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "error" in error) {
    const nested = error.error;
    if (typeof nested === "object" && nested !== null && "description" in nested && typeof nested.description === "string") {
      return nested.description.slice(0, 500);
    }
  }
  if (error instanceof Error) return error.message.slice(0, 500);
  return "Razorpay did not confirm the refund request.";
}

function mapGatewayStatus(status: string): RefundStatus {
  if (status === "pending") return "PENDING";
  if (status === "processed") return "PROCESSED";
  if (status === "failed") return "FAILED";
  throw new Error("Razorpay returned an unsupported refund status.");
}

function nextRefundStatus(current: RefundStatus, incoming: RefundStatus): RefundStatus {
  if (current === "PROCESSED") return "PROCESSED";
  if (current === "FAILED" && incoming === "PENDING") return "FAILED";
  return incoming;
}

function refundFailureReason(refund: RazorpayRefundSnapshot) {
  return refund.error_description?.slice(0, 500) || "Razorpay reported that the refund failed.";
}

async function applyGatewayRefundTx(
  tx: Prisma.TransactionClient,
  attempt: RefundWithPayment,
  gatewayRefund: RazorpayRefundSnapshot,
) {
  const payment = attempt.payment;
  if (!payment.gatewayPaymentId || gatewayRefund.payment_id !== payment.gatewayPaymentId) {
    throw new Error("Refund does not match the recorded Razorpay payment.");
  }
  if (!Number.isSafeInteger(gatewayRefund.amount) || BigInt(gatewayRefund.amount) !== attempt.amount || attempt.amount !== payment.amount) {
    throw new Error("Refund amount does not match the captured payment.");
  }
  if (gatewayRefund.currency !== attempt.currency || attempt.currency !== payment.currency) {
    throw new Error("Refund currency does not match the captured payment.");
  }
  if (gatewayRefund.receipt && gatewayRefund.receipt !== attempt.receipt) {
    throw new Error("Refund receipt does not match this refund attempt.");
  }
  const noteRefundId = gatewayRefund.notes?.novacart_refund_id;
  if (typeof noteRefundId === "string" && noteRefundId !== attempt.id) {
    throw new Error("Refund reference does not match this refund attempt.");
  }
  if (attempt.gatewayRefundId && attempt.gatewayRefundId !== gatewayRefund.id) {
    throw new Error("A different Razorpay refund is already linked to this attempt.");
  }

  const incomingStatus = mapGatewayStatus(gatewayRefund.status);
  const status = nextRefundStatus(attempt.status, incomingStatus);
  await tx.refund.update({
    where: { id: attempt.id },
    data: {
      gatewayRefundId: gatewayRefund.id,
      status,
      failureReason: status === "FAILED" ? refundFailureReason(gatewayRefund) : null,
      processedAt: status === "PROCESSED" ? new Date() : null,
    },
  });

  if (status === "PROCESSED") {
    if (payment.status !== "REFUND_REQUIRED" && payment.status !== "REFUNDED") {
      throw new Error("Payment is not awaiting a refund.");
    }
    await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
  }
  return status;
}

async function persistGatewayRefundResult(refundId: string, gatewayRefund: RazorpayRefundSnapshot) {
  return prisma.$transaction(async (tx) => {
    const identity = await tx.refund.findUnique({ where: { id: refundId }, select: { paymentId: true } });
    if (!identity) throw new Error("Refund attempt not found.");
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${identity.paymentId} FOR UPDATE`;
    const attempt = await tx.refund.findUnique({ where: { id: refundId }, include: { payment: true } });
    if (!attempt) throw new Error("Refund attempt not found.");
    return applyGatewayRefundTx(tx, attempt, gatewayRefund);
  });
}

async function setAttemptStatus(refundId: string, status: RefundStatus, failureReason: string) {
  await prisma.$transaction(async (tx) => {
    const identity = await tx.refund.findUnique({ where: { id: refundId }, select: { paymentId: true } });
    if (!identity) return;
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${identity.paymentId} FOR UPDATE`;
    await tx.refund.updateMany({
      where: { id: refundId, status: "REQUESTING" },
      data: { status, failureReason: failureReason.slice(0, 500) },
    });
  });
}

async function findRefundByReceipt(gateway: RefundGateway, gatewayPaymentId: string, receipt: string, refundId: string) {
  const result = await gateway.payments.fetchMultipleRefund(gatewayPaymentId, { count: 100, skip: 0 });
  return result.items.find((refund) =>
    refund.receipt === receipt || refund.notes?.novacart_refund_id === refundId,
  );
}

function currentAttemptMessage(status: RefundStatus) {
  if (status === "PROCESSED") return "This payment has already been refunded.";
  if (status === "FAILED") return "A refund attempt failed. Verify its status before starting another attempt.";
  if (status === "UNKNOWN") return "The refund result is unclear. Check Razorpay status before trying again.";
  if (status === "PENDING") return "A refund is already processing.";
  return "A refund request is already being submitted.";
}

export async function initiateFullRefund(
  orderId: string,
  actor: { id: string; role: UserRole },
  gateway: RefundGateway,
): Promise<RefundMutationResult> {
  if (actor.role !== "ADMIN") return { success: false, message: "Admin access is required to refund a payment." };

  const claim = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE "orderId" = ${orderId} FOR UPDATE`;
    const payment = await tx.payment.findUnique({
      where: { orderId },
      include: { order: true, refunds: { orderBy: [{ createdAt: "desc" }, { id: "desc" }] } },
    });
    if (!payment) return { kind: "unavailable" as const, message: "Payment not found for this order." };
    if (payment.status !== "REFUND_REQUIRED") return { kind: "unavailable" as const, message: "This payment is not awaiting a refund." };
    if (!payment.gatewayPaymentId || !payment.gatewayOrderId || payment.order.id !== orderId) {
      return { kind: "unavailable" as const, message: "The stored payment details are incomplete." };
    }

    const blockingAttempt = payment.refunds.find((refund) =>
      refund.status === "REQUESTING" || refund.status === "PENDING" || refund.status === "UNKNOWN" || refund.status === "PROCESSED",
    );
    if (blockingAttempt) {
      return { kind: "blocked" as const, status: blockingAttempt.status, refundId: blockingAttempt.id };
    }

    const amount = Number(payment.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return { kind: "unavailable" as const, message: "The stored refund amount is invalid." };
    }
    const attempt = await tx.refund.create({
      data: {
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        receipt: randomUUID(),
        initiatedById: actor.id,
        status: "REQUESTING",
      },
    });
    return { kind: "claimed" as const, payment, attempt };
  });

  if (claim.kind === "unavailable") return { success: false, message: claim.message };
  if (claim.kind === "blocked") {
    return { success: false, status: claim.status, refundId: claim.refundId, message: currentAttemptMessage(claim.status) };
  }

  const { payment, attempt } = claim;
  let remotePayment: RazorpayPaymentSnapshot;
  try {
    remotePayment = await gateway.payments.fetch(payment.gatewayPaymentId!);
  } catch (error) {
    const reason = safeErrorMessage(error);
    await setAttemptStatus(attempt.id, "FAILED", reason);
    console.error(JSON.stringify({ level: "error", event: "razorpay.refund.payment_fetch_failed", orderId, refundId: attempt.id }));
    return { success: false, status: "FAILED", refundId: attempt.id, message: "Razorpay could not verify the captured payment. No refund was sent." };
  }

  const capturedAmount = Number.isSafeInteger(remotePayment.amount) ? BigInt(remotePayment.amount) : BigInt(-1);
  const refundedAmount = remotePayment.amount_refunded;
  if (
    remotePayment.id !== payment.gatewayPaymentId ||
    remotePayment.order_id !== payment.gatewayOrderId ||
    remotePayment.status !== "captured" ||
    capturedAmount !== payment.amount ||
    remotePayment.currency !== payment.currency ||
    !Number.isSafeInteger(refundedAmount) ||
    refundedAmount !== 0
  ) {
    const reason = "Razorpay payment is not an unrefunded captured payment matching this order.";
    await setAttemptStatus(attempt.id, "FAILED", reason);
    console.error(JSON.stringify({ level: "error", event: "razorpay.refund.payment_validation_failed", orderId, refundId: attempt.id }));
    return { success: false, status: "FAILED", refundId: attempt.id, message: reason };
  }

  try {
    const response = await gateway.payments.refund(payment.gatewayPaymentId!, {
      amount: Number(payment.amount),
      receipt: attempt.receipt,
      notes: { novacart_refund_id: attempt.id },
    });
    const status = await persistGatewayRefundResult(attempt.id, response);
    return {
      success: status === "PENDING" || status === "PROCESSED",
      status,
      refundId: attempt.id,
      message: status === "PROCESSED" ? "The full refund was processed." : status === "PENDING" ? "The refund request was accepted and is processing." : "The refund request failed. Review the attempt details before retrying.",
    };
  } catch (error) {
    let recovered: RazorpayRefundSnapshot | undefined;
    try {
      recovered = await findRefundByReceipt(gateway, payment.gatewayPaymentId!, attempt.receipt, attempt.id);
    } catch {
      // The attempt remains UNKNOWN until a later status check can reach Razorpay.
    }
    if (recovered) {
      try {
        const status = await persistGatewayRefundResult(attempt.id, recovered);
        return {
          success: status === "PENDING" || status === "PROCESSED",
          status,
          refundId: attempt.id,
          message: status === "PROCESSED" ? "The full refund was processed." : status === "PENDING" ? "The refund is processing." : "The refund failed. Review the attempt details.",
        };
      } catch {
        // Preserve the attempt as unknown if the fetched entity does not match.
      }
    }

    const reason = safeErrorMessage(error);
    await setAttemptStatus(attempt.id, "UNKNOWN", reason);
    console.error(JSON.stringify({ level: "error", event: "razorpay.refund.request_uncertain", orderId, refundId: attempt.id }));
    return { success: false, status: "UNKNOWN", refundId: attempt.id, message: "Razorpay did not confirm the result. Check the refund status before trying again." };
  }
}

export async function reconcileRefund(
  refundId: string,
  actor: { id: string; role: UserRole },
  gateway: RefundGateway,
): Promise<RefundMutationResult> {
  if (actor.role !== "ADMIN") return { success: false, message: "Admin access is required to check refund status." };
  const attempt = await prisma.refund.findUnique({ where: { id: refundId }, include: { payment: true } });
  if (!attempt || !attempt.payment.gatewayPaymentId) return { success: false, message: "Refund attempt not found." };
  if (attempt.status === "PROCESSED") return { success: true, status: "PROCESSED", refundId, message: "The full refund was processed." };

  try {
    const found = await findRefundByReceipt(gateway, attempt.payment.gatewayPaymentId, attempt.receipt, attempt.id);
    if (!found) {
      if (attempt.status === "REQUESTING") {
        await setAttemptStatus(refundId, "UNKNOWN", "No matching refund was found yet; do not submit a duplicate request.");
      }
      const latest = await prisma.refund.findUnique({ where: { id: refundId }, select: { status: true } });
      return { success: false, status: latest?.status, refundId, message: "No matching refund is visible yet. No new refund was sent; check Razorpay again before retrying." };
    }
    const status = await persistGatewayRefundResult(refundId, found);
    return { success: status === "PENDING" || status === "PROCESSED", status, refundId, message: status === "PROCESSED" ? "The full refund was processed." : status === "PENDING" ? "The refund is processing." : "The refund failed. Review the attempt details." };
  } catch {
    console.error(JSON.stringify({ level: "error", event: "razorpay.refund.reconciliation_failed", refundId }));
    return { success: false, status: attempt.status, refundId, message: "Unable to verify refund status with Razorpay. The existing attempt remains unchanged." };
  }
}

export type RefundWebhookEntity = RazorpayRefundSnapshot;

export async function processRefundWebhookEvent(
  eventId: string,
  eventType: "refund.created" | "refund.processed" | "refund.failed",
  entity: RefundWebhookEntity,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.webhookEvent.create({ data: { eventId, eventType, processedAt: new Date() } });

      const byGatewayId = entity.id ? await tx.refund.findUnique({ where: { gatewayRefundId: entity.id }, include: { payment: true } }) : null;
      const byReceipt = entity.receipt ? await tx.refund.findUnique({ where: { receipt: entity.receipt }, include: { payment: true } }) : null;
      const noteId = entity.notes?.novacart_refund_id;
      const byNoteId = typeof noteId === "string" ? await tx.refund.findUnique({ where: { id: noteId }, include: { payment: true } }) : null;
      const matches = [byGatewayId, byReceipt, byNoteId].filter((row): row is RefundWithPayment => row !== null);
      const distinctIds = new Set(matches.map((row) => row.id));
      if (distinctIds.size > 1) throw new Error("Refund webhook identifiers point to different attempts.");
      const attempt = matches[0];
      if (!attempt) return { ignored: true as const, duplicate: false };

      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${attempt.paymentId} FOR UPDATE`;
      const current = await tx.refund.findUnique({ where: { id: attempt.id }, include: { payment: true } });
      if (!current) throw new Error("Refund attempt disappeared during webhook processing.");
      if (eventType === "refund.processed" && entity.status !== "processed") throw new Error("Processed refund event has an invalid status.");
      if (eventType === "refund.failed" && entity.status !== "failed") throw new Error("Failed refund event has an invalid status.");
      if (eventType === "refund.created" && entity.status !== "pending" && entity.status !== "processed") {
        throw new Error("Created refund event has an invalid status.");
      }
      const status = await applyGatewayRefundTx(tx, current, entity);
      return { ignored: false as const, duplicate: false, status, refundId: current.id };
    });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "";
    if (code === "P2002") {
      const existing = await prisma.webhookEvent.findUnique({ where: { eventId }, select: { id: true } });
      if (existing) return { ignored: false as const, duplicate: true as const };
    }
    throw error;
  }
}
