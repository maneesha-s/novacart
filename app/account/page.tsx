import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

export default async function AccountPage() {
  noStore();
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <section>
      <h1 className="text-3xl font-bold">My Account</h1>

      <div className="mt-6 space-y-2 rounded-lg border p-6">
        <p>
          <strong>Name:</strong> {session.user.name}
        </p>

        <p>
          <strong>Email:</strong> {session.user.email}
        </p>

        <p>
          <strong>Role:</strong> {session.user.role}
        </p>

        <p>
          <strong>User ID:</strong> {session.user.id}
        </p>
      </div>
    </section>
  );
}
