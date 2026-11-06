"use client";

import { useActionState } from "react";
import {
  updateProduct,
  type ProductFormState,
} from "@/app/actions/product";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  image: string;
};

type EditProductFormProps = {
  product: Product;
  categories: Category[];
};

const initialState: ProductFormState = {
  errors: {},
  message: "",
};

export default function EditProductForm({
  product,
  categories,
}: EditProductFormProps) {
  const updateProductWithId = updateProduct.bind(
    null,
    product.id
  );

  const [state, formAction, pending] = useActionState(
    updateProductWithId,
    initialState
  );

  return (
    <form
      action={formAction}
      className="mt-8 space-y-5"
    >
      <div>
        <label
          htmlFor="name"
          className="mb-1 block font-medium"
        >
          Name
        </label>

        <input
          id="name"
          name="name"
          defaultValue={product.name}
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.name && (
          <p className="mt-1 text-sm text-red-600">
            {state.errors.name[0]}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="slug"
          className="mb-1 block font-medium"
        >
          Slug
        </label>

        <input
          id="slug"
          name="slug"
          defaultValue={product.slug}
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.slug && (
          <p className="mt-1 text-sm text-red-600">
            {state.errors.slug[0]}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="mb-1 block font-medium"
        >
          Description
        </label>

        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={product.description}
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.description && (
          <p className="mt-1 text-sm text-red-600">
            {state.errors.description[0]}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="price"
          className="mb-1 block font-medium"
        >
          Price
        </label>

        <input
          id="price"
          name="price"
          type="number"
          step="0.01"
          defaultValue={product.price}
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.price && (
          <p className="mt-1 text-sm text-red-600">
            {state.errors.price[0]}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="stock"
          className="mb-1 block font-medium"
        >
          Stock
        </label>

        <input
          id="stock"
          name="stock"
          type="number"
          defaultValue={product.stock}
          className="w-full rounded-lg border px-4 py-2"
        />

        {state.errors?.stock && (
          <p className="mt-1 text-sm text-red-600">
            {state.errors.stock[0]}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="categoryId"
          className="mb-1 block font-medium"
        >
          Category
        </label>

        <select
          id="categoryId"
          name="categoryId"
          defaultValue={product.categoryId}
          className="w-full rounded-lg border px-4 py-2"
        >
          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
            >
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
        <label
          htmlFor="image"
          className="mb-1 block font-medium"
        >
          Image Path
        </label>

        <input
          id="image"
          name="image"
          defaultValue={product.image}
          className="w-full rounded-lg border px-4 py-2"
        />
      </div>

      {state.message && (
        <p className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-black px-6 py-3 text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}