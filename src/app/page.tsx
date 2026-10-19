import { redirect } from "next/navigation";

/**
 * The proxy sends signed-in visitors to /talks and anonymous visitors to
 * /login before this page renders. This is the fallback when the proxy did
 * not run (for example when its Supabase environment is unavailable).
 */
export default function Home() {
  redirect("/login");
}
