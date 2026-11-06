"use client";
import { useActionState } from "react";
import { updateOrderStatus } from "@/app/actions/order-admin";
import type { OrderMutationState } from "@/app/actions/order-cancel";
import type { OrderStatus } from "@/app/generated/prisma/client";
export default function OrderStatusForm({ orderId, transitions }: { orderId: string; transitions: readonly OrderStatus[] }) {
  const [state, action, pending] = useActionState(updateOrderStatus.bind(null, orderId), {} as OrderMutationState);
  return <form action={action} className="mt-4 space-y-3">
    {transitions.length ? <><label>Next status<select name="status" className="ml-3 rounded border p-2">{transitions.map(status => <option key={status} value={status}>{status}</option>)}</select></label><button disabled={pending} className="ml-3 rounded bg-black px-4 py-2 text-white disabled:opacity-50">{pending ? "Updating…" : "Update status"}</button></> : <p>This order has reached its final status.</p>}
    <p role="status">{state.message}</p>
  </form>;
}
