"use client";

import { useActionState } from "react";

import { updateAddress, type AddressState } from "@/app/actions/address";

type Address = {
  id: string;
  fullName: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
};

type EditAddressFormProps = {
  address: Address;
};

const initialState: AddressState = {};

export default function EditAddressForm({ address }: EditAddressFormProps) {
  const updateAddressWithId = updateAddress.bind(null, address.id);

  const [state, formAction, pending] = useActionState(
    updateAddressWithId,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="fullName" className="mb-1 block font-medium">
          Full Name
        </label>

        <input
          id="fullName"
          name="fullName"
          defaultValue={address.fullName}
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.fullName && (
          <p className="mt-1 text-sm text-red-600">
            {state.errors.fullName[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="addressLine" className="mb-1 block font-medium">
          Address
        </label>

        <textarea
          id="addressLine"
          name="addressLine"
          rows={3}
          defaultValue={address.addressLine}
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.addressLine && (
          <p className="mt-1 text-sm text-red-600">
            {state.errors.addressLine[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="city" className="mb-1 block font-medium">
          City
        </label>

        <input
          id="city"
          name="city"
          defaultValue={address.city}
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.city && (
          <p className="mt-1 text-sm text-red-600">{state.errors.city[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="state" className="mb-1 block font-medium">
          State
        </label>

        <input
          id="state"
          name="state"
          defaultValue={address.state}
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.state && (
          <p className="mt-1 text-sm text-red-600">{state.errors.state[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="postalCode" className="mb-1 block font-medium">
          Postal Code
        </label>

        <input
          id="postalCode"
          name="postalCode"
          defaultValue={address.postalCode}
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.postalCode && (
          <p className="mt-1 text-sm text-red-600">
            {state.errors.postalCode[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block font-medium">
          Phone
        </label>

        <input
          id="phone"
          name="phone"
          defaultValue={address.phone}
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.phone && (
          <p className="mt-1 text-sm text-red-600">{state.errors.phone[0]}</p>
        )}
      </div>

      {state.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-black px-6 py-3 text-white disabled:opacity-50"
      >
        {pending ? "Updating..." : "Update Address"}
      </button>
    </form>
  );
}
