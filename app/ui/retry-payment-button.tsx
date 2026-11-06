"use client";
import Script from "next/script";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getPaymentRetry } from "@/app/actions/payment";
import Link from "next/link";

type Props = { orderId: string };
type CheckoutResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type CheckoutOptions = { key: string; amount: number; currency: string; name: string; description: string; order_id: string; handler: (response: CheckoutResponse) => void; modal: { ondismiss: () => void } };
type CheckoutInstance = { open: () => void; on: (event: string, callback: (event: unknown) => void) => void };

export default function RetryPaymentButton({ orderId }: Props) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [expired, setExpired] = useState(false);
  const router = useRouter();
  async function pay() {
    setBusy(true); setMessage("");
    setExpired(false);
    try {
      const payment = await getPaymentRetry(orderId);
      if (!payment.success) {
        setExpired("expired" in payment && payment.expired === true);
        setMessage(payment.message ?? "Payment unavailable.");
        setBusy(false);
        return;
      }
      const RazorpayCheckout = (window as unknown as { Razorpay?: new (options: CheckoutOptions) => CheckoutInstance }).Razorpay;
      if (!ready || !RazorpayCheckout) { setMessage("Payment window is loading. Please try again."); setBusy(false); return; }
      const checkout = new RazorpayCheckout({
        key: payment.keyId, amount: payment.amount, currency: payment.currency, name: "NovaCart", description: `Order ${orderId}`, order_id: payment.gatewayOrderId,
        handler: async (response) => {
          setMessage("Verifying payment…");
          try {
            const result = await fetch("/api/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, ...response }) });
            const data = await result.json();
            if (!result.ok || !data.success || data.status !== "PAID") {
              setMessage(data.message ?? "Payment is not confirmed yet. Check the order before retrying.");
              setBusy(false);
              return;
            }
            router.refresh();
          } catch {
            setMessage("Payment confirmation is still processing. Check the order before retrying.");
          } finally { setBusy(false); }
        },
        modal: { ondismiss: () => { setMessage("Checkout closed without a confirmed payment. You can retry while this order is active."); setBusy(false); } },
      });
      checkout.on("payment.failed", () => { setMessage("Razorpay reported an unsuccessful attempt. Check your order status before trying again."); setBusy(false); });
      checkout.open();
    } catch {
      setMessage("Unable to reach payment services. Check your order before retrying.");
      setBusy(false);
    }
  }
  return <div><Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onReady={() => setReady(true)} /><button type="button" onClick={pay} disabled={busy} className="mt-4 rounded-lg bg-emerald-700 px-5 py-2 text-white disabled:opacity-60">{busy ? "Opening payment…" : "Pay now"}</button>{message && <p role="status" className="mt-2 text-sm">{message}</p>}{expired && <Link href="/cart" className="mt-2 inline-block text-emerald-800 underline">Return to your cart and place a new order</Link>}</div>;
}
