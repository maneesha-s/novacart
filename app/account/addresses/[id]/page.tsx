import { redirect } from "next/navigation";
import { requireUser, ResourceId } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
export default async function AddressPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!ResourceId.safeParse(id).success) notFound();
  const address = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (!address) notFound();
  redirect(`/account/addresses/${id}/edit`);
}
