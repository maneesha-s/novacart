import { auth } from "@/auth";
import { getAuthorizationUser } from "@/lib/data/authorization-user";
import { redirect } from "next/navigation";
export { ResourceId } from "@/lib/validation";


export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await getAuthorizationUser(session.user.id);
  if (!user?.isActive) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
