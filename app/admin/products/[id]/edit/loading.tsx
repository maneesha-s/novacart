export default function EditProductLoading() {
  return (
    <section className="mx-auto max-w-2xl" aria-busy="true">
      <h1 className="text-3xl font-bold">Edit Product</h1>
      <p role="status" className="mt-2 text-gray-600">Loading product information…</p>
      <div aria-hidden="true" className="mt-8 animate-pulse space-y-5">
        {[1, 2, 3, 4, 5].map(field => (
          <div key={field}>
            <div className="mb-2 h-4 w-24 rounded bg-gray-100" />
            <div className="h-12 rounded-lg bg-gray-100" />
          </div>
        ))}
      </div>
    </section>
  );
}
