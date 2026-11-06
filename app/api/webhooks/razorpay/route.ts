import { handleRazorpayWebhook } from "@/lib/razorpay-webhook";

export async function POST(request: Request) {
  return handleRazorpayWebhook(request);
}
