import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h2 className="text-3xl font-bold">Product not found</h2>

      <p className="mt-3 text-gray-600">
        The product you are looking for does not exist.
      </p>

      <Link
        href="/products"
        className="mt-6 inline-block rounded-lg bg-black px-5 py-3 text-white"
      >
        Back to Products
      </Link>
    </div>
  );
}
