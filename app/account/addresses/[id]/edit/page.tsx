import { requireUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditAddressForm from "./address-form";

type EditAddressPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditAddressPage({
  params,
}: EditAddressPageProps) {
  const user = await requireUser();

  const { id } = await params;

  const address = await prisma.address.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!address) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">Edit Address</h1>

      <EditAddressForm
        address={{
          id: address.id,
          fullName: address.fullName,
          addressLine: address.addressLine,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          phone: address.phone,
        }}
      />
    </section>
  );
}
