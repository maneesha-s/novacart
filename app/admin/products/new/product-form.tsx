"use client";

import { useActionState } from "react";
import { createProduct, type ProductFormState } from "@/app/actions/product";

type Category = {
  id: string;
  name: string;
};

type ProductFormProps = {
  categories: Category[];
};

const initialState: ProductFormState = {
  errors: {},
  message: "",
};

export default function ProductForm({ categories }: ProductFormProps) {
  const [state, formAction, pending] = useActionState(
    createProduct,
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
          placeholder="wireless-headphones"
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.slug && (
          <p className="mt-1 text-sm text-red-600">{state.errors.slug[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block font-medium">
          Description
        </label>

        <textarea
          id="description"
          name="description"
          rows={5}
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.description && (
          <p className="mt-1 text-sm text-red-600">
            {state.errors.description[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="price" className="mb-1 block font-medium">
          Price
        </label>

        <input
          id="price"
          name="price"
          type="number"
          step="0.01"
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.price && (
          <p className="mt-1 text-sm text-red-600">{state.errors.price[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="stock" className="mb-1 block font-medium">
          Stock
        </label>

        <input
          id="stock"
          name="stock"
          type="number"
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.stock && (
          <p className="mt-1 text-sm text-red-600">{state.errors.stock[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="categoryId" className="mb-1 block font-medium">
          Category
        </label>

        <select
          id="categoryId"
          name="categoryId"
          className="w-full rounded-lg border px-4 py-2"
        >
          <option value="">Select Category</option>

          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        {state.errors?.categoryId && (
          <p className="mt-1 text-sm text-red-600">
            {state.errors.categoryId[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="image" className="mb-1 block font-medium">
          Image Path
        </label>

        <input
          id="image"
          name="image"
          placeholder="/products/product.jpg"
          className="w-full rounded-lg border px-4 py-2"
        />
      </div>

      {state.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-black px-6 py-3 text-white disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create Product"}
      </button>
    </form>
  );
}
