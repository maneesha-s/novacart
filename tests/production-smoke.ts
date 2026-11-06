import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { createCheckoutOrder } from "../lib/checkout";
const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3001";
type Jar = Map<string, string>;
async function request(path: string, jar: Jar = new Map(), init: RequestInit = {}) {
  if (process.env.SMOKE_TRACE) console.log(`${init.method ?? "GET"} ${path}`);
  const response = await fetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(30000), redirect: "manual", headers: { Cookie: [...jar].map(([k,v]) => `${k}=${v}`).join("; "), Origin: base, ...init.headers } });
  for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(";")[0]; const i = pair.indexOf("="); jar.set(pair.slice(0,i), pair.slice(i+1)); }
  return response;
}
async function assertRedirect(response: Response, target: string) {
  if ([302,303,307,308].includes(response.status)) {
    assert.ok(response.headers.get("location")?.endsWith(target));
  } else {
    // Suspense may begin streaming the page before an auth redirect is known.
    const html = await response.text();
    assert.ok(html.includes(`NEXT_REDIRECT;replace;${target};`) || (html.includes('http-equiv="refresh"') && html.includes(`url=${target}`)), `Expected redirect to ${target}`);
  }
}
async function login(email: string, password: string) {
  const jar: Jar = new Map();
  const csrf = await (await request("/api/auth/csrf", jar)).json();
  const response = await request("/api/auth/callback/credentials", jar, { method: "POST", body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, callbackUrl: `${base}/account` }) });
  assert.ok([302,303].includes(response.status));
  const session = await (await request("/api/auth/session", jar)).json();
  assert.ok(session.user?.id, "Credentials login must return a session");
  return jar;
}
function actionForm(html: string, marker: string) {
  const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].find(match => match[1].includes(marker));
  assert.ok(form, `Missing form: ${marker}`);
  const data = new FormData();
  for (const input of form[1].matchAll(/<input\b([^>]*)>/g)) {
    const name = /\bname="([^"]*)"/.exec(input[1])?.[1];
    const value = /\bvalue="([^"]*)"/.exec(input[1])?.[1] ?? "";
    if (name) data.append(name.replaceAll("&amp;", "&"), value.replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
  }
  return data;
}
async function main() {
  const suffix = randomUUID();
  const password = randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name: "Smoke customer", email: `smoke-${suffix}@example.invalid`, passwordHash } });
  const admin = await prisma.user.create({ data: { name: "Smoke admin", email: `smoke-admin-${suffix}@example.invalid`, passwordHash, role: "ADMIN" } });
  const category = await prisma.category.create({ data: { name: `Smoke ${suffix}`, slug: `smoke-${suffix}` } });
  const product = await prisma.product.create({ data: { name: "Smoke product", slug: `smoke-${suffix}`, description: "Smoke product description", image: "/products/placeholder.svg", price: "12.34", stock: 5, categoryId: category.id } });
  const orders: string[] = [];
  try {
    for (const path of ["/", "/products?page=Infinity", "/products?page=-3", "/products?page=1.5", "/cart", "/login", "/signup"]) assert.equal((await request(path)).status, 200, path);
    const categoryHtml = await (await request(`/products?category=${category.slug}`)).text();
    assert.ok(categoryHtml.includes(category.name));
    await assertRedirect(await request("/wishlist"), "/login");
    assert.ok((await (await request("/products/no-such-smoke-product")).text()).includes("Product not found"));
    const customerJar = await login(user.email, password);
    await assertRedirect(await request("/admin", customerJar), "/");
    let html = await (await request(`/products/${product.slug}`, customerJar)).text();
    const wishlist = actionForm(html, 'name="intent"');
    assert.equal((await request(`/products/${product.slug}`, customerJar, { method: "POST", body: wishlist })).status, 200);
    assert.equal(await prisma.wishlistItem.count({ where: { userId: user.id, productId: product.id } }), 1);
    assert.ok((await (await request("/wishlist", customerJar)).text()).includes("Smoke product"));
    html = await (await request(`/products/${product.slug}`, customerJar)).text();
    const review = actionForm(html, 'name="rating"'); review.set("rating", "5"); review.set("comment", "An excellent smoke test product.");
    assert.equal((await request(`/products/${product.slug}`, customerJar, { method: "POST", body: review })).status, 200);
    assert.equal((await prisma.review.findUniqueOrThrow({ where: { userId_productId: { userId: user.id, productId: product.id } } })).rating, 5);
    html = await (await request(`/products/${product.slug}`, customerJar)).text();
    const invalidReview = actionForm(html, 'name="rating"'); invalidReview.set("rating", "6"); invalidReview.set("comment", "Invalid rating must fail.");
    await request(`/products/${product.slug}`, customerJar, { method: "POST", body: invalidReview });
    assert.equal((await prisma.review.findUniqueOrThrow({ where: { userId_productId: { userId: user.id, productId: product.id } } })).rating, 5);
    const order = await createCheckoutOrder(user.id, { fullName: "Smoke user", addressLine: "123 Smoke Road", city: "Smoke city", state: "Smoke state", postalCode: "123456", phone: "1234567890", saveAddress: false, items: [{ id: product.id, quantity: 1 }] }); orders.push(order.id);
    html = await (await request(`/orders/${order.id}`, customerJar)).text();
    const cancellation = actionForm(html, "Cancel order");
    assert.equal((await request(`/orders/${order.id}`, customerJar, { method: "POST", body: cancellation })).status, 200);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, "CANCELLED");
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 5);
    html = await (await request(`/products/${product.slug}`, customerJar)).text();
    const removeWishlist = actionForm(html, 'name="intent"');
    await request(`/products/${product.slug}`, customerJar, { method: "POST", body: removeWishlist });
    assert.equal(await prisma.wishlistItem.count({ where: { userId: user.id, productId: product.id } }), 0);
    html = await (await request(`/products/${product.slug}`, customerJar)).text();
    const deleteReview = actionForm(html, "Delete my review");
    await request(`/products/${product.slug}`, customerJar, { method: "POST", body: deleteReview });
    assert.equal(await prisma.review.count({ where: { userId: user.id, productId: product.id } }), 0);
    const adminJar = await login(admin.email, password);
    const adminOrder = await createCheckoutOrder(admin.id, { fullName: "Admin user", addressLine: "123 Smoke Road", city: "Smoke city", state: "Smoke state", postalCode: "123456", phone: "1234567890", saveAddress: false, items: [{ id: product.id, quantity: 1 }] }); orders.push(adminOrder.id);
    assert.ok((await (await request(`/orders/${adminOrder.id}`, customerJar)).text()).includes("Page not found"));
    html = await (await request(`/admin/orders/${adminOrder.id}`, adminJar)).text();
    const invalidStatus = actionForm(html, 'name="status"'); invalidStatus.set("status", "SHIPPED");
    await request(`/admin/orders/${adminOrder.id}`, adminJar, { method: "POST", body: invalidStatus });
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: adminOrder.id } })).status, "PENDING");
    const confirmedStatus = actionForm(html, 'name="status"'); confirmedStatus.set("status", "CONFIRMED");
    await request(`/admin/orders/${adminOrder.id}`, adminJar, { method: "POST", body: confirmedStatus });
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: adminOrder.id } })).status, "CONFIRMED");
    html = await (await request(`/admin/orders/${adminOrder.id}`, adminJar)).text();
    const adminCancellation = actionForm(html, 'name="status"'); adminCancellation.set("status", "CANCELLED");
    await request(`/admin/orders/${adminOrder.id}`, adminJar, { method: "POST", body: adminCancellation });
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: adminOrder.id } })).status, "CANCELLED");
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 5);
    const dashboard = await request("/admin", adminJar); assert.equal(dashboard.status, 200); assert.ok((await dashboard.text()).includes("Delivered order revenue"));
    await prisma.user.update({ where: { id: admin.id }, data: { role: "CUSTOMER" } });
    await assertRedirect(await request("/admin", adminJar), "/");
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    await assertRedirect(await request("/orders", customerJar), "/login");
    console.log("PASS: production routes, credentials login, category filter, wishlist/review Server Actions, invalid rating rejection, cancellation Server Action, dashboard, role revocation, disabled-account rejection");
  } finally {
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orders } } });
    await prisma.order.deleteMany({ where: { id: { in: orders } } });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.user.deleteMany({ where: { id: { in: [user.id, admin.id] } } });
  }
}
main().finally(() => prisma.$disconnect());
