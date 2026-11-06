import { Suspense } from "react";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/data/products";
import ProductDetails from "@/app/ui/product-details";

type ProductPageProps = { params: Promise<{ slug: string }> };

// export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
//   const { slug } = await params;
//   const product = await getProductBySlug(slug);
//   return product
//     ? { title: product.name, description: product.description }
//     : { title: "Product not found" };
// }

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found",
      description: "The requested product could not be found.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = product.name;
  const description =
    product.description?.slice(0, 160) ||
    `Discover ${product.name} at NovaCart.`;

  const url = `/products/${product.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: product.image ? [product.image] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.image ? [product.image] : [],
    },
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  return <Suspense fallback={<p role="status">Loading product…</p>}>
    <ProductDetails params={params} />
  </Suspense>;
}
