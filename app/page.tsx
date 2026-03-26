import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_SESSION_COOKIE_NAME } from "@/lib/auth-session";

/** Fallback when middleware does not run; mirrors root redirect rules. */
export default async function Home() {
  const token = (await cookies()).get(AUTH_SESSION_COOKIE_NAME)?.value;
  if (token) {
    redirect("/dashboard");
  }
  redirect("/login");
}
