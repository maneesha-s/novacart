import Link from "next/link";
import CartLink from "./cart-link";
import AccountMenu from "./account-menu";
import LogoutButton from "./logout-button";
import ShopIcon from "./shop-icon";
import { auth } from "@/auth";
import { getCategories } from "@/lib/data/categories";
import { unstable_noStore as noStore } from "next/cache";

export default async function Navbar() {
  noStore();
  const [session, allCategories] = await Promise.all([auth(), getCategories()]);
  const categories = allCategories.filter(category => category.isActive);
  const admin = session?.user?.role === "ADMIN";
  return (
    <header className="bg-[#142b2a] text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-4 sm:gap-x-7 px-4 py-5 sm:px-6">
        <Link href="/" aria-label="NovaCart home" className="flex shrink-0 items-center gap-2.5">
          <span className="grid size-9 place-items-center sm:size-10 rounded-xl bg-[#f7c76c] text-[#142b2a]"><ShopIcon name="bag" className="size-6" /></span>
          <span className="text-xl font-extrabold tracking-tight sm:text-2xl">nova<span className="text-[#f7c76c]">cart</span><span className="block text-[8px] font-medium sm:text-[9px] tracking-[.22em] text-white/60">A LITTLE MORE EVERY DAY</span></span>
        </Link>
        <form action="/products" role="search" className="order-3 flex h-12 w-full min-w-0 overflow-hidden rounded-lg bg-white text-slate-800 focus-within:ring-2 focus-within:ring-[#f7c76c] md:order-none md:w-auto md:flex-1">
          <label className="sr-only" htmlFor="nav-category">Search category</label>
          <select id="nav-category" name="category" className="hidden max-w-32 border-r border-slate-200 bg-slate-50 px-3 text-xs sm:block" defaultValue=""><option value="">All categories</option>{categories.map(category => <option key={category.id} value={category.slug}>{category.name}</option>)}</select>
          <label className="sr-only" htmlFor="nav-search">Search products</label>
          <input id="nav-search" name="search" type="search" placeholder="Search for your next favourite…" className="min-w-0 flex-1 bg-white px-4 text-sm outline-none" />
          <button type="submit" aria-label="Search" className="grid w-14 shrink-0 place-items-center bg-[#f7c76c] text-[#142b2a] transition hover:bg-[#edb94d]"><ShopIcon name="search" className="size-5" /></button>
        </form>
        <div className="ml-auto flex items-center gap-3 sm:gap-5 md:ml-0">
          <AccountMenu name={session?.user?.name} signedIn={Boolean(session?.user)}>
            <div className="absolute right-0 z-50 mt-4 w-52 rounded-xl border border-slate-100 bg-white p-2 text-sm text-slate-800 shadow-xl">
              {session?.user ? <><Link className="menu-item" href="/account">My account</Link><Link className="menu-item" href="/orders">My orders</Link><Link className="menu-item" href="/account/addresses">Saved addresses</Link><Link className="menu-item" href="/wishlist">Wishlist</Link>{admin && <Link className="menu-item" href="/admin">Admin dashboard</Link>}<div className="mt-1 border-t border-slate-100 px-3 py-2"><LogoutButton /></div></> : <><Link className="menu-item" href="/login">Sign in</Link><Link className="menu-item" href="/signup">Create an account</Link></>}
            </div>
          </AccountMenu>
          <Link href="/wishlist" aria-label="Wishlist" className="hidden rounded-lg p-1 text-white/85 transition hover:text-[#f7c76c] sm:block"><ShopIcon name="heart" className="size-5" /></Link>
          <CartLink />
        </div>
      </div>
      <nav aria-label="Shopping menu" className="border-t border-white/10 bg-[#1c3835]">
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto whitespace-nowrap px-4 py-3 text-xs font-medium sm:px-6 sm:text-sm">
          <Link href="/products" className="flex items-center gap-2 text-[#f7c76c]"><ShopIcon name="grid" className="size-4" />All products</Link>
          {categories.map(category => <Link key={category.id} href={`/products?category=${encodeURIComponent(category.slug)}`} className="transition hover:text-[#f7c76c]">{category.name}</Link>)}
          <Link href="/products?sort=price-asc" className="transition hover:text-[#f7c76c]">Budget finds</Link>
          <Link href="/orders" className="transition hover:text-[#f7c76c]">My orders</Link>
          {admin && <><span className="h-4 border-l border-white/20" /><Link href="/admin" className="text-[#f7c76c]">Dashboard</Link><Link href="/admin/products">Manage products</Link><Link href="/admin/categories">Manage categories</Link><Link href="/admin/orders">Manage orders</Link></>}
        </div>
      </nav>
    </header>
  );
}
