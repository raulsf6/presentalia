"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import { ChartIcon, FileIcon, HomeIcon, UsersIcon } from "@/components/icons";
import { activeTalkTab, type TalkTab } from "@/lib/nav";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const TABS: ReadonlyArray<{
  tab: TalkTab;
  label: string;
  icon: IconComponent;
  href: (talkId: string) => string;
}> = [
  {
    tab: "overview",
    label: "Overview",
    icon: HomeIcon,
    href: (talkId) => `/talks/${talkId}`,
  },
  {
    tab: "activities",
    label: "Activities",
    icon: ChartIcon,
    href: (talkId) => `/talks/${talkId}/activities`,
  },
  {
    tab: "roster",
    label: "Roster",
    icon: UsersIcon,
    href: (talkId) => `/talks/${talkId}/roster`,
  },
  {
    tab: "slides",
    label: "Slides",
    icon: FileIcon,
    href: (talkId) => `/talks/${talkId}/slides`,
  },
];

/**
 * Talk-scoped navigation for presenters and admins: a tab row under the app
 * bar on desktop, the same links as a fixed bottom bar on mobile.
 */
export function TalkNav({ talkId }: { talkId: string }) {
  const pathname = usePathname();
  const active = activeTalkTab(pathname, talkId);

  return (
    <nav aria-label="Talk sections" className="talk-nav">
      <div className="talk-nav-inner">
        {TABS.map(({ tab, label, icon: Icon, href }) => (
          <Link
            key={tab}
            href={href(talkId)}
            prefetch={true}
            className="talk-tab"
            aria-current={active === tab ? "page" : undefined}
          >
            <span className="talk-tab-icon">
              <Icon className="size-5" />
            </span>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
