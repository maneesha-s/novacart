"use client";

import { useActionState } from "react";
import { createCategory, type CategoryFormState } from "@/app/actions/category";

const initialState: CategoryFormState = {
  errors: {},
  message: "",
};

export default function CategoryForm() {
  const [state, formAction, pending] = useActionState(
    createCategory,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="name" className="mb-1 block font-medium">
          Name
        </label>

        <input
          id="name"
          name="name"
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.name && (
          <p className="mt-1 text-sm text-red-600">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="slug" className="mb-1 block font-medium">
          Slug
        </label>

        <input
          id="slug"
          name="slug"
          placeholder="home-appliances"
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.slug && (
          <p className="mt-1 text-sm text-red-600">{state.errors.slug[0]}</p>
        )}
      </div>

      {state.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-black px-6 py-3 text-white disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create Category"}
      </button>
    </form>
  );
}
