import "dotenv/config";
import assert from "node:assert/strict";
import type { PrismaClient } from "../app/generated/prisma/client";

async function main() {
  let disconnected = false;
  const stale = {
    product: {},
    $disconnect: async () => { disconnected = true; },
  };
  const cache = globalThis as unknown as { prisma?: PrismaClient };
  cache.prisma = stale as unknown as PrismaClient;
  const { prisma } = await import("../lib/prisma");
  try {
    assert.notEqual(prisma, stale);
    assert.equal(cache.prisma, prisma);
    assert.equal(disconnected, true);
    assert.equal(typeof prisma.wishlistItem.findMany, "function");
    assert.equal(typeof prisma.review.findMany, "function");
    await prisma.wishlistItem.count();
    await prisma.review.count();
    console.log("PASS: stale pre-wishlist client replaced, disconnected, and new models query successfully");
  } finally {
    await prisma.$disconnect();
    delete cache.prisma;
  }
}
main();
