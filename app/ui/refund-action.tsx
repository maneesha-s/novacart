"use client";

import { useActionState } from "react";
import { initiateRefund, reconcileRefundAction, type RefundActionState } from "@/app/actions/refund";

const initialState: RefundActionState = { success: false, message: "" };

export function RefundAction({ orderId, amount, enabled }: { orderId: string; amount: string; enabled: boolean }) {
  const [state, action, pending] = useActionState(initiateRefund.bind(null, orderId), initialState);
  if (!enabled) return null;

  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="font-semibold text-amber-950">Issue a full refund of {amount}?</p>
      <p className="mt-1 text-sm text-amber-900">This sends the entire captured amount to Razorpay and cannot be cancelled once accepted.</p>
      <form action={action} className="mt-3 space-y-3">
        <label className="flex items-start gap-2 text-sm text-amber-950">
          <input type="checkbox" name="confirmRefund" value="yes" required className="mt-1" />
          I verified this order and confirm the full refund.
        </label>
        <button disabled={pending} className="rounded bg-amber-800 px-4 py-2 font-semibold text-white disabled:opacity-50">
          {pending ? "Submitting refund…" : "Issue full refund"}
        </button>
      </form>
      {state.message && <p role="status" className="mt-3 text-sm">{state.message}</p>}
    </div>
  );
}

export function ReconcileRefundButton({ refundId }: { refundId: string }) {
  const [state, action, pending] = useActionState(reconcileRefundAction.bind(null, refundId), initialState);
  return (
    <div className="mt-2">
      <form action={action}>
        <button disabled={pending} className="rounded border border-gray-400 px-3 py-1 text-sm disabled:opacity-50">
          {pending ? "Checking Razorpay…" : "Check Razorpay status"}
        </button>
      </form>
      {state.message && <p role="status" className="mt-2 text-sm text-gray-700">{state.message}</p>}
    </div>
  );
}
