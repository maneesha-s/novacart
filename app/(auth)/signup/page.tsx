import SignupForm from "./signup-form";

export default function SignupPage() {
  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">
        Create Account
      </h1>

      <p className="mt-2 text-gray-600">
        Create your NovaCart account.
      </p>

      <SignupForm />
    </section>
  );
}