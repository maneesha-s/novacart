"use server";
import { z } from "zod";
import { requireAdmin, ResourceId } from "@/lib/authorization";
import { transitionOrder } from "@/lib/order-lifecycle";
import type { OrderMutationState } from "@/app/actions/order-cancel";
import { revalidatePath, updateTag } from "next/cache";
const OrderStatusSchema = z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]);
export async function updateOrderStatus(orderId: string, previous: OrderMutationState, formData: FormData): Promise<OrderMutationState> {
  await requireAdmin();
  void previous;
  const parsed = z.object({ id: ResourceId, status: OrderStatusSchema }).safeParse({ id: orderId, status: formData.get("status") });
  if (!parsed.success) return { message: "Invalid order status." };
  const result = await transitionOrder(parsed.data.id, parsed.data.status);
  if (result.success) {
    updateTag("products");
    for (const path of ["/admin", "/admin/orders", `/admin/orders/${orderId}`, "/orders", `/orders/${orderId}`, "/products", "/admin/products"]) revalidatePath(path);
    revalidatePath("/products/[slug]", "page");
  }
  return result;
}
