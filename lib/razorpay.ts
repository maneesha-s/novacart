import "server-only";
import Razorpay from "razorpay";

export function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay test credentials are not configured.");
  return { client: new Razorpay({ key_id: keyId, key_secret: keySecret }), keyId };
}

type GatewayOrder = { id: string; receipt?: string | null; amount: number; currency: string; status?: string };

/** Reuses the gateway's unique receipt when concurrent or retried creates race. */
export async function getOrCreateRazorpayOrder(payment: { orderId: string; amount: bigint; currency: string }) {
  const { client } = getRazorpay();
  const amount = Number(payment.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Payment amount is invalid.");

  async function findByReceipt() {
    const result = await client.orders.all({ receipt: payment.orderId }) as unknown as { items: GatewayOrder[] };
    const found = result.items.find((order) => order.receipt === payment.orderId);
    if (!found) return undefined;
    if (found.amount !== amount || found.currency !== payment.currency) {
      throw new Error("An existing Razorpay order does not match this payment.");
    }
    return found;
  }

  const existing = await findByReceipt();
  if (existing) return existing;
  try {
    return await client.orders.create({ amount, currency: payment.currency, receipt: payment.orderId }) as unknown as GatewayOrder;
  } catch (error) {
    // A concurrent request may have created the unique receipt while this call
    // was in flight. Look it up before returning the provider error.
    const recovered = await findByReceipt();
    if (recovered) return recovered;
    throw error;
  }
}
