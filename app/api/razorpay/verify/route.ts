import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { processCapturedPayment, verifySignature } from "@/lib/payment-processing";
import { readBoundedBody } from "@/lib/read-bounded-body";

const Body = z.object({
  orderId: z.string().uuid(),
  razorpay_order_id: z.string().min(5).max(100),
  razorpay_payment_id: z.string().min(5).max(100),
  razorpay_signature: z.string().regex(/^[a-f\d]{64}$/i),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ message: "Sign in required." }, { status: 401 });
  const body = await readBoundedBody(request, 4096);
  if (body === null) return Response.json({ message: "Request too large." }, { status: 413 });
  let raw: unknown;
  try { raw = JSON.parse(body); } catch { return Response.json({ message: "Invalid request." }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return Response.json({ message: "Invalid payment details." }, { status: 400 });
  const { orderId, razorpay_order_id: gatewayOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = parsed.data;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !verifySignature(`${gatewayOrderId}|${paymentId}`, signature, secret)) {
    return Response.json({ message: "Invalid payment signature." }, { status: 400 });
  }

  const ownedPayment = await prisma.payment.findFirst({
    where: { orderId, gatewayOrderId, order: { userId: session.user.id } },
    select: { id: true },
  });
  if (!ownedPayment) return Response.json({ message: "Payment not found." }, { status: 404 });

  try {
    const result = await processCapturedPayment(gatewayOrderId, paymentId);
    console.info(JSON.stringify({ level: "info", event: "razorpay.payment.verification", status: result.status }));
    if (result.status !== "PAID") {
      return Response.json({
        success: false,
        status: result.status,
        message: result.status === "REFUND_REQUIRED" ? "Payment arrived after the order reservation expired. A refund is required." : "This payment was already refunded.",
      }, { status: 409 });
    }
    return Response.json({ success: true, status: "PAID" });
  } catch {
    console.error(JSON.stringify({ level: "error", event: "razorpay.payment.verification_failed", orderId }));
    return Response.json({ message: "Payment is not confirmed yet. Check the order before retrying." }, { status: 409 });
  }
}
