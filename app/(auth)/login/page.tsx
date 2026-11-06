import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import LoginForm from "./login-form";

export default async function LoginPage() {
  noStore();
  const session = await auth();

  if (session?.user) {
    redirect("/account");
  }

  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Login</h1>

      <p className="mt-2 text-gray-600">Sign in to your NovaCart account.</p>

      <LoginForm />
    </section>
  );
}
