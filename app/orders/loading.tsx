export default function Loading() {
  return <section role="status" aria-busy="true"><p className="text-gray-600">Loading orders…</p><div aria-hidden="true" className="mt-6 grid animate-pulse gap-4 sm:grid-cols-3">{[1,2,3].map(item => <div key={item} className="h-40 rounded-xl bg-gray-100" />)}</div></section>;
}
