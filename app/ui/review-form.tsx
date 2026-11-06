"use client";
import { useActionState } from "react";
import { saveReview, type ReviewState } from "@/app/actions/review";
export default function ReviewForm({ productId, review }: { productId: string; review?: { rating: number; comment: string } }) {
  const [state, action, pending] = useActionState(saveReview, {} as ReviewState);
  return <form action={action} className="mt-4 space-y-3">
    <input type="hidden" name="productId" value={productId} />
    <label className="block">Rating<select name="rating" defaultValue={review?.rating ?? 5} className="ml-3 rounded border p-2">{[5,4,3,2,1].map(r => <option key={r} value={r}>{r} stars</option>)}</select></label>
    <label className="block">Your review<textarea name="comment" required minLength={5} maxLength={2000} defaultValue={review?.comment} className="mt-2 block w-full rounded border p-3" /></label>
    <button disabled={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">{pending ? "Saving…" : review ? "Update review" : "Submit review"}</button>
    <p role="status">{state.message}</p>
  </form>;
}
