"use server";
import { requireUser, ResourceId } from "@/lib/authorization";
import { transitionOrder } from "@/lib/order-lifecycle";
import { revalidatePath, updateTag } from "next/cache";
export type OrderMutationState = { message?: string; success?: boolean };
export async function cancelOrder(orderId: string, previous: OrderMutationState): Promise<OrderMutationState> {
  void previous;
  const user = await requireUser();
  const parsed = ResourceId.safeParse(orderId);
  if (!parsed.success) return { message: "Invalid order." };
  const result = await transitionOrder(parsed.data, "CANCELLED", user.id);
  if (result.success) {
    updateTag("products");
    for (const path of ["/orders", `/orders/${orderId}`, "/admin", "/admin/orders", `/admin/orders/${orderId}`, "/products", "/admin/products"]) revalidatePath(path);
    revalidatePath("/products/[slug]", "page");
  }
  return result;
}
