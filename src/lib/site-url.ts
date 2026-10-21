import { headers } from "next/headers";

/**
 * The deployment's public origin, without a trailing slash. Configured
 * explicitly in production; request headers make previews and local use work
 * without extra environment setup.
 */
export async function getSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) {
    return "http://localhost:3000";
  }
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
