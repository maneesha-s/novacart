import { prisma } from "@/lib/prisma";
import { processCapturedPayment, verifySignature } from "@/lib/payment-processing";
import { readBoundedBody } from "@/lib/read-bounded-body";
import { processRefundWebhookEvent, type RazorpayRefundSnapshot } from "@/lib/refund-service";
import { z } from "zod";

const EventSchema = z.object({
  event: z.string().min(1).max(100),
  payload: z.object({
    payment: z.object({ entity: z.object({ id: z.string().min(1).max(100), order_id: z.string().min(1).max(100) }).passthrough() }).optional(),
    refund: z.object({
      entity: z.object({
        id: z.string().min(1).max(100),
        payment_id: z.string().min(1).max(100),
        amount: z.number().int().positive().refine(Number.isSafeInteger),
        currency: z.string().length(3),
        receipt: z.string().max(100).nullable().optional(),
        notes: z.unknown().optional(),
        status: z.string().min(1).max(30),
        error_description: z.string().max(500).nullable().optional(),
        created_at: z.number().int().optional(),
      }).passthrough(),
    }).optional(),
  }).passthrough().optional(),
}).passthrough();
const EventIdSchema = z.string().regex(/^[a-z\d_-]{1,128}$/i);

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "PROCESSING_ERROR";
}

export async function handleRazorpayWebhook(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error(JSON.stringify({ level: "error", event: "razorpay.webhook.misconfigured" }));
    return Response.json({ message: "Webhook is unavailable." }, { status: 500 });
  }
  const rawBody = await readBoundedBody(request, 1_000_000);
  if (rawBody === null) return Response.json({ message: "Request too large." }, { status: 413 });
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifySignature(rawBody, signature, secret)) return Response.json({ message: "Invalid webhook signature." }, { status: 401 });

  const eventId = EventIdSchema.safeParse(request.headers.get("x-razorpay-event-id"));
  if (!eventId.success) return Response.json({ message: "Invalid webhook event ID." }, { status: 400 });
  let json: unknown;
  try { json = JSON.parse(rawBody); } catch { return Response.json({ message: "Invalid webhook payload." }, { status: 400 }); }
  const parsed = EventSchema.safeParse(json);
  if (!parsed.success) return Response.json({ message: "Invalid webhook payload." }, { status: 400 });
  const eventType = parsed.data.event;

  try {
    if (eventType === "payment.captured") {
      const payment = parsed.data.payload?.payment?.entity;
      if (!payment) return Response.json({ message: "Missing captured payment details." }, { status: 400 });
      const result = await processCapturedPayment(payment.order_id, payment.id, eventId.data);
      console.info(JSON.stringify({ level: "info", event: result.status === "PAID" ? "razorpay.payment.captured" : "razorpay.payment.refund_required", eventId: eventId.data }));
    } else if (eventType === "refund.created" || eventType === "refund.processed" || eventType === "refund.failed") {
      const entity = parsed.data.payload?.refund?.entity;
      if (!entity) return Response.json({ message: "Missing refund details." }, { status: 400 });
      const notes = typeof entity.notes === "object" && entity.notes !== null && !Array.isArray(entity.notes)
        ? entity.notes as Record<string, unknown>
        : undefined;
      const result = await processRefundWebhookEvent(eventId.data, eventType, { ...entity, notes } as RazorpayRefundSnapshot);
      console.info(JSON.stringify({
        level: result.ignored ? "warn" : "info",
        event: result.ignored ? "razorpay.refund.webhook_unmatched" : result.duplicate ? "razorpay.webhook.duplicate" : `razorpay.${eventType.replaceAll(".", "_")}`,
        eventId: eventId.data,
        ...("refundId" in result && result.refundId ? { refundId: result.refundId } : {}),
      }));
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.webhookEvent.create({ data: { eventId: eventId.data, eventType, processedAt: new Date() } });
      });
      console.info(JSON.stringify({ level: "info", event: eventType === "payment.failed" ? "razorpay.payment.failed_event" : "razorpay.webhook.ignored", eventId: eventId.data }));
    }
    return Response.json({ received: true });
  } catch (error) {
    if (errorCode(error) === "P2002") {
      const existing = await prisma.webhookEvent.findUnique({ where: { eventId: eventId.data }, select: { id: true } });
      if (existing) {
        console.info(JSON.stringify({ level: "info", event: "razorpay.webhook.duplicate", eventId: eventId.data }));
        return Response.json({ received: true, duplicate: true });
      }
    }
    console.error(JSON.stringify({ level: "error", event: "razorpay.webhook.processing_failed", eventId: eventId.data, eventType, code: errorCode(error) }));
    return Response.json({ message: "Webhook processing failed." }, { status: 500 });
  }
}
