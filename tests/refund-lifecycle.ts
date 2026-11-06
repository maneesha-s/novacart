import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import {
  initiateFullRefund,
  processRefundWebhookEvent,
  reconcileRefund,
  type RazorpayPaymentSnapshot,
  type RazorpayRefundSnapshot,
  type RefundGateway,
} from "../lib/refund-service";

const amount = BigInt(1250);

async function main() {
  const suffix = randomUUID();
  const customer = await prisma.user.create({ data: { name: "Refund test customer", email: `refund-customer-${suffix}@example.invalid`, passwordHash: "test-only" } });
  const admin = await prisma.user.create({ data: { name: "Refund test admin", email: `refund-admin-${suffix}@example.invalid`, passwordHash: "test-only", role: "ADMIN" } });
  const orderIds: string[] = [];
  const paymentIds: string[] = [];
  const webhookEventIds: string[] = [];

  async function fixture(status: "PENDING" | "REFUND_REQUIRED" | "REFUNDED" = "REFUND_REQUIRED") {
    const order = await prisma.order.create({
      data: {
        userId: customer.id,
        status: status === "PENDING" ? "PENDING" : "CANCELLED",
        totalAmount: "12.50",
        fullName: "Refund test",
        addressLine: "Test address",
        city: "Test city",
        state: "Test state",
        postalCode: "123456",
        phone: "1234567890",
      },
    });
    orderIds.push(order.id);
    const paymentId = `pay_${randomUUID().replaceAll("-", "")}`;
    const gatewayOrderId = `order_${randomUUID().replaceAll("-", "")}`;
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        gatewayOrderId,
        gatewayPaymentId: paymentId,
        amount,
        currency: "INR",
        status,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    paymentIds.push(payment.id);
    const remotePayment: RazorpayPaymentSnapshot = {
      id: paymentId,
      order_id: gatewayOrderId,
      status: "captured",
      amount: Number(amount),
      amount_refunded: 0,
      currency: "INR",
    };
    return { order, payment, remotePayment };
  }

  function mockGateway(remotePayment: RazorpayPaymentSnapshot, onRefund?: (paymentId: string, body: { amount: number; receipt: string; notes: Record<string, string> }) => Promise<RazorpayRefundSnapshot>) {
    let refundCalls = 0;
    const storedRefunds: RazorpayRefundSnapshot[] = [];
    const gateway: RefundGateway = {
      payments: {
        fetch: async () => remotePayment,
        refund: async (paymentId, body) => {
          refundCalls++;
          const response = onRefund
            ? await onRefund(paymentId, body)
            : {
                id: `rfnd_${randomUUID().replaceAll("-", "")}`,
                payment_id: paymentId,
                amount: body.amount,
                currency: "INR",
                receipt: body.receipt,
                notes: body.notes,
                status: "processed",
              };
          storedRefunds.push(response);
          return response;
        },
        fetchMultipleRefund: async (paymentId) => ({ items: storedRefunds.filter((refund) => refund.payment_id === paymentId) }),
      },
    };
    return { gateway, refundCalls: () => refundCalls, storedRefunds };
  }

  try {
    const eligible = await fixture();
    const successMock = mockGateway(eligible.remotePayment);
    const success = await initiateFullRefund(eligible.order.id, admin, successMock.gateway);
    assert.equal(success.success, true);
    assert.equal(success.status, "PROCESSED");
    const saved = await prisma.refund.findUniqueOrThrow({ where: { id: success.refundId } });
    assert.equal(saved.paymentId, eligible.payment.id);
    assert.equal(saved.initiatedById, admin.id);
    assert.equal(saved.gatewayRefundId, successMock.storedRefunds[0].id);
    assert.equal(saved.amount, amount);
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: eligible.payment.id } })).status, "REFUNDED");
    assert.equal(successMock.refundCalls(), 1);

    const unauthorized = await fixture();
    const unauthorizedMock = mockGateway(unauthorized.remotePayment);
    const customerResult = await initiateFullRefund(unauthorized.order.id, customer, unauthorizedMock.gateway);
    assert.equal(customerResult.success, false);
    assert.equal(unauthorizedMock.refundCalls(), 0);
    assert.equal(await prisma.refund.count({ where: { paymentId: unauthorized.payment.id } }), 0);

    const alreadyRefunded = await fixture("REFUNDED");
    const alreadyMock = mockGateway(alreadyRefunded.remotePayment);
    assert.equal((await initiateFullRefund(alreadyRefunded.order.id, admin, alreadyMock.gateway)).success, false);
    assert.equal(alreadyMock.refundCalls(), 0);

    const pending = await fixture("PENDING");
    const pendingMock = mockGateway(pending.remotePayment);
    assert.equal((await initiateFullRefund(pending.order.id, admin, pendingMock.gateway)).success, false);
    assert.equal(pendingMock.refundCalls(), 0);

    const mismatch = await fixture();
    const mismatchMock = mockGateway({ ...mismatch.remotePayment, amount: Number(amount) + 1 });
    const mismatchResult = await initiateFullRefund(mismatch.order.id, admin, mismatchMock.gateway);
    assert.equal(mismatchResult.status, "FAILED");
    assert.equal(mismatchMock.refundCalls(), 0);
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: mismatch.payment.id } })).status, "REFUND_REQUIRED");

    const concurrent = await fixture();
    let releaseRefund: (() => void) | undefined;
    let notifyRefundStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { notifyRefundStarted = resolve; });
    const wait = new Promise<void>((resolve) => { releaseRefund = resolve; });
    const concurrentMock = mockGateway(concurrent.remotePayment, async (paymentId, body) => {
      notifyRefundStarted?.();
      await wait;
      return {
        id: `rfnd_${randomUUID().replaceAll("-", "")}`,
        payment_id: paymentId,
        amount: body.amount,
        currency: "INR",
        receipt: body.receipt,
        notes: body.notes,
        status: "pending",
      };
    });
    const firstRequest = initiateFullRefund(concurrent.order.id, admin, concurrentMock.gateway);
    await started;
    const secondRequest = await initiateFullRefund(concurrent.order.id, admin, concurrentMock.gateway);
    releaseRefund?.();
    const firstResult = await firstRequest;
    assert.equal(firstResult.status, "PENDING");
    assert.equal(secondRequest.success, false);
    assert.equal(concurrentMock.refundCalls(), 1);

    const processedWebhook = await fixture();
    const attempt = await prisma.refund.create({
      data: { paymentId: processedWebhook.payment.id, amount, currency: "INR", receipt: randomUUID(), initiatedById: admin.id },
    });
    const processedEntity: RazorpayRefundSnapshot = {
      id: `rfnd_${randomUUID().replaceAll("-", "")}`,
      payment_id: processedWebhook.payment.gatewayPaymentId!,
      amount: Number(amount),
      currency: "INR",
      receipt: attempt.receipt,
      notes: { novacart_refund_id: attempt.id },
      status: "processed",
    };
    const processedEventId = randomUUID();
    webhookEventIds.push(processedEventId);
    const processedEvent = await processRefundWebhookEvent(processedEventId, "refund.processed", processedEntity);
    assert.equal(processedEvent.ignored, false);
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: processedWebhook.payment.id } })).status, "REFUNDED");
    assert.equal((await prisma.refund.findUniqueOrThrow({ where: { id: attempt.id } })).gatewayRefundId, processedEntity.id);
    const duplicateEvent = await processRefundWebhookEvent(processedEventId, "refund.processed", processedEntity);
    assert.equal(duplicateEvent.duplicate, true);

    const failedWebhook = await fixture();
    const failedAttempt = await prisma.refund.create({
      data: { paymentId: failedWebhook.payment.id, amount, currency: "INR", receipt: randomUUID(), initiatedById: admin.id },
    });
    const failedEntity: RazorpayRefundSnapshot = {
      id: `rfnd_${randomUUID().replaceAll("-", "")}`,
      payment_id: failedWebhook.payment.gatewayPaymentId!,
      amount: Number(amount),
      currency: "INR",
      receipt: failedAttempt.receipt,
      notes: { novacart_refund_id: failedAttempt.id },
      status: "failed",
      error_description: "Test refund failure",
    };
    const failedEventId = randomUUID();
    webhookEventIds.push(failedEventId);
    await processRefundWebhookEvent(failedEventId, "refund.failed", failedEntity);
    assert.equal((await prisma.refund.findUniqueOrThrow({ where: { id: failedAttempt.id } })).status, "FAILED");
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: failedWebhook.payment.id } })).status, "REFUND_REQUIRED");

    const unknownWebhook = await fixture();
    const unknownEntity: RazorpayRefundSnapshot = {
      id: `rfnd_${randomUUID().replaceAll("-", "")}`,
      payment_id: unknownWebhook.payment.gatewayPaymentId!,
      amount: Number(amount),
      currency: "INR",
      receipt: randomUUID(),
      status: "processed",
    };
    const unknownEventId = randomUUID();
    webhookEventIds.push(unknownEventId);
    const ignored = await processRefundWebhookEvent(unknownEventId, "refund.processed", unknownEntity);
    assert.equal(ignored.ignored, true);
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: unknownWebhook.payment.id } })).status, "REFUND_REQUIRED");

    const timeout = await fixture();
    let remoteAccepted: RazorpayRefundSnapshot | undefined;
    let timeoutCalls = 0;
    const timeoutGateway: RefundGateway = {
      payments: {
        fetch: async () => timeout.remotePayment,
        refund: async (paymentId, body) => {
          timeoutCalls++;
          remoteAccepted = {
            id: `rfnd_${randomUUID().replaceAll("-", "")}`,
            payment_id: paymentId,
            amount: body.amount,
            currency: "INR",
            receipt: body.receipt,
            notes: body.notes,
            status: "pending",
          };
          throw new Error("simulated response timeout");
        },
        fetchMultipleRefund: async () => ({ items: [] }),
      },
    };
    const timeoutResult = await initiateFullRefund(timeout.order.id, admin, timeoutGateway);
    assert.equal(timeoutResult.status, "UNKNOWN");
    const blockedRetry = await initiateFullRefund(timeout.order.id, admin, timeoutGateway);
    assert.equal(blockedRetry.success, false);
    assert.equal(timeoutCalls, 1);
    assert.ok(remoteAccepted);

    const reconcileGateway: RefundGateway = {
      payments: {
        fetch: async () => timeout.remotePayment,
        refund: async () => { throw new Error("must not create a second refund"); },
        fetchMultipleRefund: async () => ({ items: [remoteAccepted!] }),
      },
    };
    const reconciled = await reconcileRefund(timeoutResult.refundId!, admin, reconcileGateway);
    assert.equal(reconciled.status, "PENDING");
    assert.equal((await prisma.refund.findUniqueOrThrow({ where: { id: timeoutResult.refundId } })).gatewayRefundId, remoteAccepted!.id);
    assert.equal(timeoutCalls, 1);

    console.log("PASS: admin eligibility, customer denial, captured amount verification, full refund persistence, concurrent request protection");
    console.log("PASS: processed/failed refund webhooks, webhook deduplication, unknown refund isolation, timeout reconciliation without duplicate refund");
  } finally {
    await prisma.webhookEvent.deleteMany({ where: { eventId: { in: webhookEventIds } } });
    await prisma.refund.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.user.deleteMany({ where: { id: { in: [customer.id, admin.id] } } });
  }
}

main().finally(() => prisma.$disconnect());
