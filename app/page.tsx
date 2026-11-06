import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { getProducts } from "@/lib/data/products";
import { getCategories } from "@/lib/data/categories";
import ProductCard from "@/app/ui/product-card";
import ShopIcon from "@/app/ui/shop-icon";

export default function HomePage() {
  return <div className="space-y-10 sm:space-y-12">
    <section className="relative grid overflow-hidden rounded-2xl bg-[#e8ede4] md:min-h-[390px] md:grid-cols-2 lg:rounded-3xl">
      <div className="relative z-10 px-7 py-10 sm:px-12 sm:py-14">
        <p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-[#476657]">Thoughtful finds. Everyday favourites.</p>
        <h1 className="max-w-lg text-4xl font-extrabold leading-[1.08] tracking-tight text-[#142b2a] sm:text-5xl lg:text-6xl">Small upgrades.<br />Big everyday joy.</h1>
        <p className="mt-5 max-w-sm text-sm leading-7 text-[#52625a] sm:text-base">From your next gadget to your everyday essentials, discover something that feels just right.</p>
        <Link href="/products" className="mt-7 inline-flex items-center gap-4 rounded-lg bg-[#142b2a] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#2c5148]">Explore the collection<ShopIcon name="arrow" className="size-4" /></Link>
      </div>
      <div className="relative min-h-64 md:min-h-full">
        <Image src="/products/laptop.jpg" alt="A laptop on a thoughtfully arranged desk" fill sizes="(max-width: 768px) 100vw, 50vw" priority className="object-cover" loading="eager"/>
        <div className="absolute bottom-6 right-6 rounded-xl bg-white/95 px-5 py-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-[#64766b]">Make room for something new</p><p className="mt-1 text-lg font-bold text-[#142b2a]">Your next favourite is here.</p></div>
      </div>
    </section>
    <Suspense fallback={<div role="status" className="grid animate-pulse gap-4 sm:grid-cols-3"><span className="sr-only">Loading collections and products…</span>{[1,2,3].map(i => <div key={i} className="h-48 rounded-2xl bg-slate-200" />)}</div>}><HomeCollections /></Suspense>
    <section className="flex flex-col justify-between gap-6 rounded-2xl bg-[#142b2a] px-7 py-8 text-white sm:flex-row sm:items-center sm:px-10">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-[#f7c76c]">Save it for later</p><h2 className="mt-2 text-2xl font-bold tracking-tight">Good finds deserve a place on your list.</h2><p className="mt-2 text-sm text-white/60">Keep your favourites together and come back whenever you like.</p></div>
      <Link href="/wishlist" className="inline-flex shrink-0 items-center justify-center gap-3 rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold transition hover:bg-white/10"><ShopIcon name="heart" className="size-4" />Explore your wishlist</Link>
    </section>
  </div>;
}
async function HomeCollections() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const active = categories.filter(category => category.isActive);
  return <>
    {active.length > 0 && <section><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#698076]">Find your kind of favourite</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-[#142b2a]">Shop by category</h2></div><Link href="/products" className="flex items-center gap-2 text-xs font-semibold text-[#426657]">View all<ShopIcon name="arrow" className="size-4" /></Link></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{active.map((category, index) => {
        const image = products.items.find(product => product.categoryName === category.name)?.image;
        return <Link key={category.id} href={`/products?category=${encodeURIComponent(category.slug)}`} className="group relative flex min-h-36 items-center justify-between overflow-hidden rounded-2xl border border-white bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
          <div className="relative z-10"><span className="text-[10px] font-semibold tracking-widest text-slate-400">COLLECTION {String(index + 1).padStart(2,"0")}</span><h3 className="mt-2 text-lg font-bold text-[#142b2a]">{category.name}</h3><span className="mt-4 flex items-center gap-2 text-xs font-medium text-[#698076]">Discover more<ShopIcon name="arrow" className="size-3" /></span></div>
          {image ? <div className="relative ml-4 size-24 shrink-0 overflow-hidden rounded-full bg-[#f4f6f2]"><Image src={image} alt="" fill sizes="96px" loading="eager" className="object-cover transition duration-300 group-hover:scale-110" /></div> : <span className="ml-4 grid size-20 shrink-0 place-items-center rounded-full bg-[#edf1e8] text-[#426657]"><ShopIcon name="box" className="size-8" /></span>}
        </Link>;
      })}</div>
    </section>}
    <section><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#698076]">Fresh picks from our shelves</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-[#142b2a]">Discover the latest</h2></div><Link href="/products" className="flex items-center gap-2 text-xs font-semibold text-[#426657]">Shop all products<ShopIcon name="arrow" className="size-4" /></Link></div>
      {products.items.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.items.map(product => <ProductCard key={product.id} product={product} />)}</div> : <p className="rounded-xl border bg-white p-8 text-slate-500">New products are on their way. Check back soon.</p>}
    </section>
  </>;
}
