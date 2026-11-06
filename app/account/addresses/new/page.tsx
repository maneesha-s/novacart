import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import AddressForm from "./address-form";

export default async function NewAddressPage() {
  noStore();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">
        Add Address
      </h1>

      <AddressForm />
    </section>
  );
}