import { signOutAction } from "@/actions/auth";

/** Signs the user out of Supabase and returns them to the login page. */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="linky">
        Sign out
      </button>
    </form>
  );
}
