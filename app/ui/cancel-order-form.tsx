"use client";
import { useActionState } from "react";
import { cancelOrder, type OrderMutationState } from "@/app/actions/order-cancel";
export default function CancelOrderForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(cancelOrder.bind(null, orderId), {} as OrderMutationState);
  return <form action={action} className="mt-4"><button disabled={pending} className="rounded border border-red-600 px-4 py-2 text-red-700 disabled:opacity-50">{pending ? "Cancelling…" : "Cancel order"}</button><p role="status" className="mt-2">{state.message}</p></form>;
}
