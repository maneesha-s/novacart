import { logout } from "@/app/actions/auth";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="text-sm">
        Logout
      </button>
    </form>
  );
}
