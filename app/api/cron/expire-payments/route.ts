
import { expirePendingPayments } from "@/lib/payment-processing";
import { timingSafeEqual } from "node:crypto";

async function runExpiry(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret) return Response.json({ success: false, message: "Expiry job is not configured." }, { status: 503 });
  const expectedBytes = Buffer.from(secret);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });

  try {
    const expiredCount = await expirePendingPayments();
    console.info(JSON.stringify({ level: "info", event: "razorpay.payment.expiry_job_completed", expiredCount }));
    return Response.json({
      success: true,
      expiredPayments: expiredCount,
    });
  } catch (error) {
    console.error(JSON.stringify({ level: "error", event: "razorpay.payment.expiry_job_failed", code: typeof error === "object" && error !== null && "code" in error ? error.code : "UNKNOWN" }));
    return Response.json({ success: false, message: "Payment expiry job failed." }, { status: 500 });
  }
}

export const GET = runExpiry;
export const POST = runExpiry;
