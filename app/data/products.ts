export type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  category: string;
  description: string;
  image: string;
};

export const products: Product[] = [
  {
    id: 1,
    name: "Wireless Headphones",
    slug: "wireless-headphones",
    price: 4999,
    category: "Electronics",
    description:
      "Premium wireless headphones with rich sound and comfortable ear cushions.",
    image: "/products/headphones.jpg",
  },
  {
    id: 2,
    name: "Smart Watch",
    slug: "smart-watch",
    price: 6999,
    category: "Electronics",
    description:
      "Track activity, notifications and daily fitness goals from your wrist.",
    image: "/products/smart-watch.jpg",
  },
  {
    id: 3,
    name: "Classic Backpack",
    slug: "classic-backpack",
    price: 2499,
    category: "Accessories",
    description:
      "A lightweight backpack suitable for work, travel and everyday use.",
    image: "/products/backpack.jpg",
  },
];
