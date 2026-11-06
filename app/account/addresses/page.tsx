import Link from "next/link";

import { requireUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

import { setDefaultAddress, deleteAddress } from "@/app/actions/address";

export default async function AddressesPage() {
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
    <section>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Saved Addresses</h1>

        <Link
          href="/account/addresses/new"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Add Address
        </Link>
      </div>

      {addresses.length === 0 && (
        <p className="mt-8 text-gray-600">
          You haven&apos;t saved any addresses yet.
        </p>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <div key={address.id} className="rounded-lg border p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{address.fullName}</h2>

              {address.isDefault && (
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold">
                  Default
                </span>
              )}
            </div>

            <p className="mt-2">{address.addressLine}</p>

            <p>
              {address.city}, {address.state}
            </p>

            <p>{address.postalCode}</p>

            <p className="mt-2">{address.phone}</p>

            <div className="mt-5 flex items-center gap-4">
              {!address.isDefault && (
                <form action={setDefaultAddress.bind(null, address.id)}>
                  <button
                    type="submit"
                    className="text-sm font-medium underline"
                  >
                    Set as default
                  </button>
                </form>
              )}

              <Link
                href={`/account/addresses/${address.id}/edit`}
                className="text-sm font-medium underline"
              >
                Edit
              </Link>

              <form action={deleteAddress.bind(null, address.id)}>
                <button
                  type="submit"
                  className="text-sm font-medium text-red-600 underline"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
