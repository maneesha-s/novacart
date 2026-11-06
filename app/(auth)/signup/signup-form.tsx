"use client";

import { useActionState } from "react";
import { signup, type SignupState } from "@/app/actions/auth";

const initialState: SignupState = {
  success: false,
  message: "",
  errors: {},
};

export default function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="name" className="mb-1 block font-medium">
          Name
        </label>

        <input
          id="name"
          name="name"
          type="text"
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.name && (
          <p className="mt-1 text-sm text-red-600">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block font-medium">
          Email
        </label>

        <input
          id="email"
          name="email"
          type="email"
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.email && (
          <p className="mt-1 text-sm text-red-600">{state.errors.email[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block font-medium">
          Password
        </label>

        <input
          id="password"
          name="password"
          type="password"
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.password && (
          <p className="mt-1 text-sm text-red-600">
            {state.errors.password[0]}
          </p>
        )}
      </div>

      {state.message && (
        <p
          className={
            state.success ? "text-sm text-green-600" : "text-sm text-red-600"
          }
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
      >
        {pending ? "Creating account..." : "Sign Up"}
      </button>
    </form>
  );
}
