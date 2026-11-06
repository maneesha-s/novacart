import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3001";
const cookies = new Map<string, string>();
async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
    headers: { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "), Origin: base },
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0];
    const index = pair.indexOf("=");
    cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return response;
}
async function assertRedirect(path: string, target: string) {
  const response = await request(path);
  const html = await response.text();
  assert.ok(response.headers.get("location")?.endsWith(target) ||
    html.includes(`NEXT_REDIRECT;replace;${target};`) ||
    (html.includes('http-equiv="refresh"') && html.includes(`url=${target}`)), `Expected ${path} to redirect to ${target}`);
}
async function main() {
  const suffix = randomUUID();
  const password = randomUUID();
  const user = await prisma.user.create({ data: {
    name: "Edit regression admin", email: `edit-${suffix}@example.invalid`,
    passwordHash: await bcrypt.hash(password, 12), role: "ADMIN",
  } });
  const category = await prisma.category.create({ data: { name: `Edit ${suffix}`, slug: `edit-${suffix}` } });
  const product = await prisma.product.create({ data: {
    name: "Edit regression product", slug: `edit-${suffix}`, description: "Product edit regression fixture",
    price: "12.34", stock: 7, categoryId: category.id,
  } });
  const path = `/admin/products/${product.id}/edit`;
  try {
    await assertRedirect(path, "/login");
    const csrf = await (await request("/api/auth/csrf")).json();
    const login = await request("/api/auth/callback/credentials", {
      method: "POST", body: new URLSearchParams({ email: user.email, password, csrfToken: csrf.csrfToken, callbackUrl: `${base}/admin/products` }),
    });
    await login.text();
    assert.ok([302, 303].includes(login.status));
    for (const label of ["first", "repeat"]) {
      const start = performance.now();
      const response = await request(path);
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.ok(html.includes("Edit Product") && html.includes(product.name));
      assert.ok(html.includes(category.name));
      assert.ok(html.includes('value="12.34"') && html.includes('value="7"'));
      console.log(`PASS: ${label} edit page renders correct form (${Math.round(performance.now() - start)} ms)`);
    }
    await prisma.user.update({ where: { id: user.id }, data: { role: "CUSTOMER" } });
    await assertRedirect(path, "/");
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN", isActive: false } });
    await assertRedirect(path, "/login");
    console.log("PASS: edit page blocks anonymous users, revoked admins, and disabled accounts across requests");
  } finally {
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}
main().finally(() => prisma.$disconnect());
