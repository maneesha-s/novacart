import SubmitButton from "@/app/ui/submit-button";
import Link from "next/link";
import ReviewForm from "@/app/ui/review-form";
import { deleteReview } from "@/app/actions/review";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/data/products";
import AddToCartButton from "@/app/ui/add-to-cart-button";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isWishlisted } from "@/lib/data/wishlists";
import WishlistButton from "@/app/ui/wishlist-button";
import { unstable_noStore as noStore } from "next/cache";

export default async function ProductDetails({ params }: { params: Promise<{ slug: string }> }) {
  noStore();
  const { slug } = await params;

  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const session = await auth();

  const wished = session?.user?.id
    ? await isWishlisted(session.user.id, product.id)
    : false;

  const [reviews, summary] = await Promise.all([
    prisma.review.findMany({
      where: { productId: product.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: true,
    }),
  ]);
  const ownReview = session?.user?.id
    ? await prisma.review.findUnique({
        where: {
          userId_productId: { userId: session.user.id, productId: product.id },
        },
      })
    : null;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.name,
  description: product.description,
  image: product.image ? [product.image] : [],
  offers: {
    "@type": "Offer",
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/products/${product.slug}`,
    priceCurrency: "INR",
    price: product.price.toString(),
    availability:
      product.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
  },
};

  return (
    <section className="grid gap-10 md:grid-cols-2">
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
      <div className="relative min-h-[420px] overflow-hidden rounded-xl">
        <Image
          src={product.image ?? "/products/placeholder.svg"}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          loading="eager"
        />
      </div>

      <div>
        <p className="text-sm text-gray-500">{product.categoryName}</p>

        <h1 className="mt-2 text-4xl font-bold">{product.name}</h1>

        <p className="mt-5 text-2xl font-semibold">
          ₹{product.price.toLocaleString("en-IN")}
        </p>

        <p className="mt-6 leading-7 text-gray-600">{product.description}</p>

        <p className="mt-4 text-sm text-gray-500">Stock: {product.stock}</p>
        <AddToCartButton
          product={{
            id: product.id,
            name: product.name,
            price: product.price,
          }}
        />
        <WishlistButton productId={product.id} isWishlisted={wished} />
      </div>
      <div className="md:col-span-2 border-t pt-8">
        <h2 className="text-2xl font-bold">Reviews and ratings</h2>
        <p className="mt-2">
          {summary._count
            ? `${summary._avg.rating?.toFixed(1)} / 5 · ${summary._count} reviews`
            : "No reviews yet. Be the first to review this product."}
        </p>
        {session?.user ? (
          <ReviewForm productId={product.id} review={ownReview ?? undefined} />
        ) : (
          <Link href="/login" className="mt-4 block underline">
            Sign in to write a review
          </Link>
        )}
        {ownReview && (
          <form action={deleteReview} className="mt-3">
            <input type="hidden" name="productId" value={product.id} />
            <SubmitButton>Delete my review</SubmitButton>
          </form>
        )}
        <div className="mt-6 space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="rounded border p-4">
              <p className="font-semibold">
                {review.user.name} · {review.rating} / 5
              </p>
              <p className="text-sm text-gray-500">
                {review.createdAt.toLocaleDateString("en-IN")}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{review.comment}</p>
            </article>
          ))}
        </div>
        {summary._count > 50 && (
          <p className="mt-4">Showing the latest 50 reviews.</p>
        )}
      </div>
    </section>
  );
}
