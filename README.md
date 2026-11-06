NovaCart — Full-stack e-commerce platform built with Next.js App Router, TypeScript, PostgreSQL and Prisma. Implements Server Components, Server Actions, authentication, role-based admin features, product search/filtering, cart, checkout, orders, caching/revalidation and responsive accessible UI.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

Dynamic routes in the App Router are created using square-bracket folders such as [slug]. The dynamic value is available through the route params, and we can use it to fetch or locate the corresponding resource.

One important learning point here: keep prisma and @prisma/client on the same major version.

---

I calculate skip as (page - 1) \* pageSize and use Prisma's skip and take to fetch only the current page. I separately count the filtered records to calculate totalPages. Since the list query and count query are independent, I run them in parallel using Promise.all().

---

Browser APIs such as localStorage are unavailable during server rendering, so I access them from a Client Component after mounting, typically inside useEffect.

---

Email is used as the login identifier, so the database should enforce uniqueness rather than relying only on application-level validation.

---

safeParse() gives us a result object rather than throwing for ordinary validation errors.

---

const [state, formAction, pending] =
useActionState(signup, initialState);

means:
state
→ result returned by server action

formAction
→ function passed to <form action={...}>

pending
→ true while submission is running

---

I use auth() inside a Server Component to read the current session. If no authenticated user exists, I redirect before rendering protected content.

---

z.coerce.number()

is useful because form values arrive as strings.

---

## revalidatePath("/products") invalidates cached data for that route so the next render gets fresh product data after the mutation.

---

On db change - Run following command sequentially
npx prisma format
npx prisma validate
npx prisma migrate dev --name add-orders
npx prisma generate

---

## Never trust the price coming from the browser.

## During checkout I never trust prices sent by the browser. I send only product IDs and requested quantities, reload the products from the database, verify availability and stock, calculate the total server-side, and create the order plus stock updates inside a database transaction.

## During checkout I don’t trust the stock or price shown on the UI. I query the latest product data on the server and use a Prisma transaction. Stock is decremented using a conditional updateMany with stock >= requestedQuantity, so two users cannot both successfully reserve the same last item. If any product fails validation, the transaction rolls back. After a successful checkout, I invalidate the cached product listing because stock has changed.

## Wishlist, reviews, and order lifecycle

- `/wishlist` lists the current user's saved products. Products can be saved from their detail page, and unavailable products can still be removed.
- Product details show the average rating and the latest 50 reviews. Signed-in users can create, update, or delete their own single review per product.
- Customers can cancel pending or confirmed orders from their order detail page. Admin cancellation uses the same transaction and restores stock exactly once.
- Allowed status changes: `PENDING -> CONFIRMED -> SHIPPED -> DELIVERED`; `PENDING` or `CONFIRMED` may become `CANCELLED`. Delivered and cancelled orders are final.
- Category filter options come from PostgreSQL. `/admin` shows counts, delivered-order revenue, status totals, low stock, and recent orders.
- Mutations use Zod and current database authorization. Checkout reloads product prices, uses exact decimal totals, and conditionally reserves stock inside its transaction. Duplicate cart lines are rejected. Saved-address changes verify ownership; default changes are serialized per user.

For a fresh checkout, use the project's Prisma 7 config explicitly:

```sh
pnpm exec prisma migrate deploy --config prisma7.config.ts
pnpm exec prisma generate --config prisma7.config.ts
pnpm typecheck
pnpm lint
pnpm build
pnpm test:orders
```

`test:orders` requires the configured PostgreSQL database. It creates uniquely named fixtures and removes only those fixtures afterward. It covers status rules, ownership, cancellation/shipping races, rollback, checkout contention, decimal totals, and validation.

For the production smoke test, run a local production server in one terminal:

```powershell
$env:AUTH_URL = "http://localhost:3001"
pnpm run start -- --port 3001
```

## Then run `pnpm test:smoke` in another terminal. It exercises credentials login, protected routes, wishlist/review/cancellation Server Actions, invalid status and rating rejection, dashboard rendering, role revocation, and account deactivation. Set `AUTH_URL` to the actual site origin in production.

“My category query is cached because it is shared across users, but authentication cannot be globally cached because it depends on the current request. So I keep requireAdmin() dynamic and place that route content behind a Suspense boundary.”

## Product quick view: parallel and intercepting routes

`app/layout.tsx` renders two slots: `children` (the normal page) and `modal` (the named `@modal` parallel route). A parallel route allows the product listing and quick view to remain rendered together; it is different from fetching data in parallel.

`app/@modal/(.)products/[slug]/page.tsx` intercepts navigation to `/products/[slug]` from the shared root layout, including Products and Wishlist. The `(.)` marker counts route segments, so `@modal` does not count as a URL segment. Clicking **View Product** from the listing opens product details in the modal while preserving the listing, its filters, and pagination. Close, Escape, and browser Back dismiss it; Forward reopens it.

Opening a product URL directly or refreshing uses `app/products/[slug]/page.tsx`, the full product page. Both routes reuse the Server Component `app/ui/product-details.tsx`; database reads, reviews, wishlist, and cart controls retain their existing behavior. Only the dialog shell, `app/ui/product-modal.tsx`, is a Client Component, responsible for focus, scroll locking, and navigation.

The slot's `default.tsx`, `page.tsx`, and `[...catchAll]/page.tsx` render nothing when no modal should be open. Its `error.tsx` and `not-found.tsx` keep failures inside the quick view, and Suspense provides its loading state.

## Categories can now be activated or deactivated in the admin table. Inactive categories are excluded from storefront browsing and checkout. Saved wishlist entries remain removable when unavailable. Cache invalidation runs in Server Actions after database changes have completed, including product/category edits and stock changes.

## Razorpay test payments

Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `CRON_SECRET` in the local environment. Use Razorpay **Test Mode** credentials; never commit these values. Apply the new database migration with `pnpm exec prisma migrate deploy --config prisma7.config.ts`, then run `pnpm exec prisma generate --config prisma7.config.ts`.

Checkout reserves stock for 30 minutes, creates the Razorpay order on the server, and verifies the signature and captured amount on the server. Configure a Razorpay Test Mode webhook at `/api/webhooks/razorpay` for `payment.captured`, `payment.failed`, `refund.created`, `refund.processed`, and `refund.failed`. `/api/razorpay/webhook` remains a compatibility alias; both use the same handler and event store. The webhook validates the bounded raw request body with `RAZORPAY_WEBHOOK_SECRET`; event IDs make delivery idempotent. Local webhook delivery needs a public staging URL or a supported tunnel.

The customer retry action and order page lazily expire an overdue reservation; the scheduled job is a backup. `vercel.json` invokes `/api/cron/expire-payments` daily, which is the supported Hobby frequency. `/api/razorpay/expire` is a compatibility alias. For faster stock release, configure an external scheduler to call the cron endpoint more often with `Authorization: Bearer <CRON_SECRET>`. A late captured payment is flagged as `REFUND_REQUIRED`; paid-order cancellation also records that status. An admin can initiate a full refund from the admin order page. Refund attempts and gateway responses are stored locally, and pending or uncertain attempts can be reconciled from that page. Configure separate live-mode keys and webhook secret only after end-to-end test-mode checks.

Parallel Routes allow me to render multiple independent route slots inside the same layout. In my e-commerce project I could have the product listing as the normal children slot and a @modal slot for a product quick view.

And:
Intercepting Routes let me intercept navigation to /products/[slug] and display that product inside the modal when navigation originates from the product listing. If the URL is opened directly, Next.js renders the normal full product page instead.

---

## Prefixing a folder with \_ creates a private folder and opts that folder and its children out of the routing system.

folder group
(shop)

means:
Don't include this folder name in the URL.

Whereas:
\_shop

means:
Don't treat this folder as part of routing at all.

---

(folder)
↓
Route Group
folder name hidden from URL
routes inside still accessible

\_folder
↓
Private Folder
excluded from routing
