import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const electronics = await prisma.category.upsert({
    where: {
      slug: "electronics",
    },
    update: {},
    create: {
      name: "Electronics",
      slug: "electronics",
    },
  });

  const accessories = await prisma.category.upsert({
    where: {
      slug: "accessories",
    },
    update: {},
    create: {
      name: "Accessories",
      slug: "accessories",
    },
  });

  await prisma.product.upsert({
    where: {
      slug: "wireless-headphones",
    },
    update: {},
    create: {
      name: "Wireless Headphones",
      slug: "wireless-headphones",
      description:
        "Premium wireless headphones with rich sound and comfortable ear cushions.",
      price: 4999,
      stock: 25,
      image: "/products/headphones.jpg",
      categoryId: electronics.id,
    },
  });

  await prisma.product.upsert({
    where: {
      slug: "smart-watch",
    },
    update: {},
    create: {
      name: "Smart Watch",
      slug: "smart-watch",
      description:
        "Track activity, notifications and daily fitness goals from your wrist.",
      price: 6999,
      stock: 15,
      image: "/products/smart-watch.jpg",
      categoryId: electronics.id,
    },
  });

  await prisma.product.upsert({
    where: {
      slug: "classic-backpack",
    },
    update: {},
    create: {
      name: "Classic Backpack",
      slug: "classic-backpack",
      description:
        "A lightweight backpack suitable for work, travel and everyday use.",
      price: 2499,
      stock: 30,
      image: "/products/backpack.jpg",
      categoryId: accessories.id,
    },
  });

  await prisma.product.upsert({
    where: {
      slug: "wireless-headphones",
    },
    update: {},
    create: {
      name: "Wireless Headphones",
      slug: "wireless-headphones",
      description:
        "Premium wireless headphones with rich sound and comfortable ear cushions.",
      price: 4999,
      stock: 25,
      image: "/products/headphones.jpg",
      categoryId: electronics.id,
    },
  });

  await prisma.product.upsert({
    where: {
      slug: "camera",
    },
    update: {},
    create: {
      name: "Camera",
      slug: "camera",
      description: "Camera.",
      price: 4999,
      stock: 25,
      image: "/products/camera.jpg",
      categoryId: electronics.id,
    },
  });
  await prisma.product.upsert({
    where: {
      slug: "laptop",
    },
    update: {},
    create: {
      name: "Laptop",
      slug: "laptop",
      description: "Laptop.",
      price: 4999,
      stock: 25,
      image: "/products/laptop.jpg",
      categoryId: electronics.id,
    },
  });
  await prisma.product.upsert({
    where: {
      slug: "mobile",
    },
    update: {},
    create: {
      name: "Mobile",
      slug: "mobile",
      description: "Mobile.",
      price: 4999,
      stock: 25,
      image: "/products/mobile.jpg",
      categoryId: electronics.id,
    },
  });

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
