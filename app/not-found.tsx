import Link from "next/link";
export default function NotFound() {
  return <section className="py-12 text-center"><h1 className="text-3xl font-bold">Page not found</h1><p className="mt-3">This resource is unavailable or you do not have access to it.</p><Link href="/products" className="mt-5 inline-block rounded border px-5 py-2">Browse products</Link></section>;
}
