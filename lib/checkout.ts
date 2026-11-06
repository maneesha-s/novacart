import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { CheckoutSchema, ResourceId } from "@/lib/validation";
import type { z } from "zod";

export class CheckoutError extends Error {}
export async function createCheckoutOrder(
  userId: string,
  input: z.infer<typeof CheckoutSchema>,
  checkoutKey?: string,
) {
  ResourceId.parse(userId);

  const data = CheckoutSchema.parse(input);
  if (checkoutKey) ResourceId.parse(checkoutKey);

  const order = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });

    if (!user?.isActive) {
      throw new CheckoutError("Please sign in before checkout.");
    }

    const items = [...data.items].sort((a, b) => a.id.localeCompare(b.id));

    const products = await tx.product.findMany({
      where: {
        id: {
          in: items.map((item) => item.id),
        },
        isActive: true,
        category: { isActive: true },
      },
    });

    if (products.length !== items.length) {
      throw new CheckoutError("Some products are no longer available.");
    }

    let totalAmount = new Prisma.Decimal(0);

    const orderItems = [];

    for (const item of items) {
      const product = products.find((product) => product.id === item.id)!;

      const reserved = await tx.product.updateMany({
        where: {
          id: product.id,
          isActive: true,
          category: { isActive: true },
          stock: {
            gte: item.quantity,
          },
          price: product.price,
        },

        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });

      if (reserved.count !== 1) {
        throw new CheckoutError(
          `Stock or price changed for ${product.name}. Please try again.`,
        );
      }

      totalAmount = totalAmount.plus(product.price.mul(item.quantity));

      orderItems.push({
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: item.quantity,
      });
    }

    if (totalAmount.gt("99999999.99")) {
      throw new CheckoutError("Order total exceeds the allowed limit.");
    }

    const { items: cartItems, saveAddress, ...shipping } = data;

    void cartItems;

    const order = await tx.order.create({
      data: {
        ...(checkoutKey ? { checkoutKey } : {}),
        userId,
        ...shipping,
        totalAmount,
        payment: {
          create: {
            amount: totalAmount.mul(100).toNumber(),
            currency: "INR",
            status: "PENDING",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        },
        items: { create: orderItems },
      },
    });

    if (saveAddress) {
      const existing = await tx.address.findFirst({
        where: {
          userId,
          ...shipping,
        },
      });

      if (!existing) {
        await tx.address.create({
          data: {
            userId,
            ...shipping,
          },
        });
      }
    }

    return order;
  });


  return order;
}
