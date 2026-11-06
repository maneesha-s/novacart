"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checkOrderPaymentExpiry } from "@/app/actions/payment";

export default function PaymentExpiryCheck({ orderId }: { orderId: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [message, setMessage] = useState("Checking the expired payment reservation…");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void checkOrderPaymentExpiry(orderId)
      .then((result) => {
        if (result.expired) router.refresh();
        else setMessage("Could not confirm the payment reservation yet. Refresh this page to check again.");
      })
      .catch(() => setMessage("Could not update this payment reservation. Refresh this page to try again."));
  }, [orderId, router]);

  return <p role="status" className="mt-2 text-sm text-amber-800">{message}</p>;
}
