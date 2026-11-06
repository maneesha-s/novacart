import { requireUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import CheckoutForm from "./checkout-form";


export default async function CheckoutPage() {
  const user = await requireUser();

  const addresses = await prisma.address.findMany({
    where: {
      userId: user.id,
    },
    orderBy: [
      {
        isDefault: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold">Checkout</h1>

      <p className="mt-2 text-gray-600">
        Review your order and delivery details.
      </p>

      <CheckoutForm
        addresses={addresses.map((address) => ({
          id: address.id,
          fullName: address.fullName,
          addressLine: address.addressLine,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          phone: address.phone,
          isDefault: address.isDefault,
        }))}
      />
    </section>
  );
}
