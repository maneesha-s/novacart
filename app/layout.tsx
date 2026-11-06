import type { Metadata } from "next";
import "./globals.css";

import Navbar from "./ui/navbar";
import Footer from "./ui/footer";
import { CartProvider } from "./providers/cart-provider";
import { Suspense } from "react";

// export const metadata: Metadata = {
//   title: {
//     template: "%s | NovaCart",
//     default: "NovaCart",
//   },
//   description: "Modern full-stack e-commerce platform",
// };

// import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "NovaCart | Online Shopping",
    template: "%s | NovaCart",
  },
  description:
    "Discover quality products at great prices with NovaCart.",
  applicationName: "NovaCart",

  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),

  openGraph: {
    type: "website",
    siteName: "NovaCart",
    title: "NovaCart | Online Shopping",
    description:
      "Discover quality products at great prices with NovaCart.",
  },

  twitter: {
    card: "summary_large_image",
    title: "NovaCart | Online Shopping",
    description:
      "Discover quality products at great prices with NovaCart.",
  },
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Suspense fallback={<NavbarSkeleton />}>
            <Navbar />
          </Suspense>

          <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
            {children}
            {modal}
          </main>

          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
function NavbarSkeleton() {
  return (
    <nav className="h-36 bg-[#142b2a] text-white md:h-32">
      <div className="mx-auto max-w-7xl px-6 py-6 font-bold">NovaCart</div>
    </nav>
  );
}
