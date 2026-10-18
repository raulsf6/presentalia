import { signOutAction } from "@/actions/auth";

/** Signs the user out of Supabase and returns them to the login page. */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        Sign out
      </button>
    </form>
  );
}
