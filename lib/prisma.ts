import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const cached = globalForPrisma.prisma;
// Hot reload preserves globalThis even after regenerating Prisma Client.
// A client created before these models existed must not be reused.
export const prisma =
  cached && cached.wishlistItem && cached.review
    ? cached
    : new PrismaClient({
        adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
      });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  if (cached && cached !== prisma) {
    void cached.$disconnect().catch(() => {
      // The replaced development client may already have disconnected.
    });
  }
}
