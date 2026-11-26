import Link from "next/link";

import { ArrowLeftIcon } from "@/components/icons";

/** Icon-only navigation with an accessible name and a native hover label. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} title={label} className="icon-btn">
      <ArrowLeftIcon className="size-5" />
    </Link>
  );
}
