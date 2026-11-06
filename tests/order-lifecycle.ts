import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createCheckoutOrder } from "../lib/checkout";
import { CheckoutSchema, AddressSchema, SignupSchema } from "../lib/validation";
import { prisma } from "../lib/prisma";
import { transitionOrder } from "../lib/order-lifecycle";
import { canTransition, ORDER_TRANSITIONS } from "../lib/order-status";
import { expirePendingPayment } from "../lib/payment-expiry";

async function main() {
  const suffix = randomUUID();
  const user = await prisma.user.create({ data: { name: "Lifecycle test", email: `test-${suffix}@example.invalid`, passwordHash: "test-only" } });
  const stranger = await prisma.user.create({ data: { name: "Other test", email: `other-${suffix}@example.invalid`, passwordHash: "test-only" } });
  const category = await prisma.category.create({ data: { name: `Test ${suffix}`, slug: `test-${suffix}` } });
  const product = await prisma.product.create({ data: { name: "Test product", slug: `test-${suffix}`, description: "Test", price: "10.25", stock: 0, categoryId: category.id } });
  const orderIds: string[] = [];
  async function order(status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" = "PENDING", productId = product.id) {
    const result = await prisma.order.create({ data: { userId: user.id, status, totalAmount: "20.50", fullName: "Test", addressLine: "Test address", city: "Test", state: "Test", postalCode: "123456", phone: "1234567890", items: { create: { productId, productName: "Test product", price: "10.25", quantity: 2 } } } });
    orderIds.push(result.id);
    return result;
  }
  try {
    for (const from of Object.keys(ORDER_TRANSITIONS) as (keyof typeof ORDER_TRANSITIONS)[]) {
      for (const to of Object.keys(ORDER_TRANSITIONS) as (keyof typeof ORDER_TRANSITIONS)[]) {
        const expected: Record<keyof typeof ORDER_TRANSITIONS, string[]> = { PENDING: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["SHIPPED", "CANCELLED"], SHIPPED: ["DELIVERED"], DELIVERED: [], CANCELLED: [] };
        const allowed = expected[from].includes(to);
        assert.equal(canTransition(from, to), allowed);
      }
    }
    const pending = await order();
    assert.equal((await transitionOrder(pending.id, "CANCELLED", stranger.id)).success, undefined);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 0);
    const results = await Promise.all([transitionOrder(pending.id, "CANCELLED", user.id), transitionOrder(pending.id, "CANCELLED", user.id)]);
    assert.equal(results.filter(result => result.success).length, 1);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 2);
    assert.equal((await transitionOrder(pending.id, "CONFIRMED")).success, undefined);
    const shipped = await order("SHIPPED");
    assert.equal((await transitionOrder(shipped.id, "CANCELLED", user.id)).success, undefined);
    assert.equal((await transitionOrder(shipped.id, "DELIVERED")).success, true);
    assert.equal((await transitionOrder(shipped.id, "PENDING")).success, undefined);
    const race = await order("CONFIRMED");
    const raced = await Promise.all([transitionOrder(race.id, "CANCELLED", user.id), transitionOrder(race.id, "SHIPPED")]);
    assert.equal(raced.filter(result => result.success).length, 1);
    const final = await prisma.order.findUniqueOrThrow({ where: { id: race.id } });
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, final.status === "CANCELLED" ? 4 : 2);
    const broken = await order("PENDING", randomUUID());
    await assert.rejects(transitionOrder(broken.id, "CANCELLED", user.id));
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: broken.id } })).status, "PENDING");
    const shipping = { fullName: "Test customer", addressLine: "123 Test Road", city: "Test city", state: "Test state", postalCode: "123456", phone: "1234567890" };
    const checkout = { ...shipping, saveAddress: true, items: [{ id: product.id, quantity: 1 }] };
    assert.equal(CheckoutSchema.safeParse({ ...checkout, items: [{ id: product.id, quantity: 1 }, { id: product.id, quantity: 1 }] }).success, false);
    for (const quantity of [0, -1, 1.5, Number.POSITIVE_INFINITY, 100001]) assert.equal(CheckoutSchema.safeParse({ ...checkout, items: [{ id: product.id, quantity }] }).success, false);
    assert.equal(AddressSchema.safeParse({ ...shipping, fullName: "   " }).success, false);
    assert.equal(SignupSchema.safeParse({ name: "Admin", email: "admin@example.com", password: "x".repeat(73), role: "ADMIN" }).success, false);
    await prisma.product.update({ where: { id: product.id }, data: { stock: 1 } });
    const checkouts = await Promise.allSettled([createCheckoutOrder(user.id, checkout), createCheckoutOrder(user.id, checkout)]);
    assert.equal(checkouts.filter(result => result.status === "fulfilled").length, 1);
    for (const result of checkouts) if (result.status === "fulfilled") {
      orderIds.push(result.value.id);
      assert.equal(result.value.totalAmount.toString(), "10.25");
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: result.value.id } });
      assert.equal(payment.amount, BigInt(1025));
      assert.equal(payment.status, "PENDING");
    }
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 0);
    assert.equal(await prisma.address.count({ where: { userId: user.id } }), 1);
    const unpaidOrder = checkouts.find(result => result.status === "fulfilled");
    assert.ok(unpaidOrder?.status === "fulfilled");
    const unpaidId = unpaidOrder.value.id;
    assert.equal((await transitionOrder(unpaidId, "CONFIRMED")).success, undefined);
    const unpaidCancellations = await Promise.all([transitionOrder(unpaidId, "CANCELLED", user.id), transitionOrder(unpaidId, "CANCELLED", user.id)]);
    assert.equal(unpaidCancellations.filter(result => result.success).length, 1);
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { orderId: unpaidId } })).status, "EXPIRED");
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 1);
    const timedOrder = await createCheckoutOrder(user.id, checkout, randomUUID());
    orderIds.push(timedOrder.id);
    await prisma.payment.update({ where: { orderId: timedOrder.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const expiryRace = await Promise.all([expirePendingPayment(timedOrder.id), expirePendingPayment(timedOrder.id)]);
    assert.equal(expiryRace.filter(result => result.stockRestored).length, 1);
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { orderId: timedOrder.id } })).status, "EXPIRED");
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: timedOrder.id } })).status, "CANCELLED");
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 1);
    await assert.rejects(createCheckoutOrder(user.id, { ...checkout, items: [{ id: product.id, quantity: 1 }, { id: product.id, quantity: 1 }] }));
    await prisma.product.update({ where: { id: product.id }, data: { stock: 1, isActive: false } });
    await assert.rejects(createCheckoutOrder(user.id, checkout));
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 1);
    await prisma.product.update({ where: { id: product.id }, data: { isActive: true } });
    await prisma.category.update({ where: { id: category.id }, data: { isActive: false } });
    await assert.rejects(createCheckoutOrder(user.id, checkout));
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 1);
    await prisma.category.update({ where: { id: category.id }, data: { isActive: true } });
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    await assert.rejects(createCheckoutOrder(user.id, checkout));
    console.log("PASS: checkout contention, exact decimal totals, duplicate cart rejection, inactive products/users, bounded inputs");
    console.log("PASS: transition matrix, ownership, concurrent cancellation and expiry, shipping race, transaction rollback");
  } finally {
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.address.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: { in: [user.id, stranger.id] } } });
  }
}
main().finally(() => prisma.$disconnect());
