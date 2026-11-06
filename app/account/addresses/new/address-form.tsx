"use client";

import { useActionState } from "react";
import { createAddress, type AddressState } from "@/app/actions/address";

const initialState: AddressState = {};

export default function AddressForm() {
  const [state, formAction, pending] = useActionState(
    createAddress,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input
        name="fullName"
        placeholder="Full Name"
        className="w-full rounded-lg border px-4 py-2"
      />

      <textarea
        name="addressLine"
        placeholder="Address"
        className="w-full rounded-lg border px-4 py-2"
      />

      <input
        name="city"
        placeholder="City"
        className="w-full rounded-lg border px-4 py-2"
      />

      <input
        name="state"
        placeholder="State"
        className="w-full rounded-lg border px-4 py-2"
      />

      <input
        name="postalCode"
        placeholder="Postal Code"
        className="w-full rounded-lg border px-4 py-2"
      />

      <input
        name="phone"
        placeholder="Phone"
        className="w-full rounded-lg border px-4 py-2"
      />

      {state.errors && <ul role="alert" className="text-sm text-red-600">{Object.entries(state.errors).map(([field, errors]) => <li key={field}>{field}: {errors?.[0]}</li>)}</ul>}

      {state.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        disabled={pending}
        className="rounded-lg bg-black px-6 py-3 text-white"
      >
        {pending ? "Saving..." : "Save Address"}
      </button>
    </form>
  );
}
