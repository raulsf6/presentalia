export const TALK_TABS = [
  "overview",
  "activities",
  "roster",
  "slides",
] as const;

export type TalkTab = (typeof TALK_TABS)[number];

/** Which talk section a pathname belongs to; null outside this talk. */
export function activeTalkTab(
  pathname: string,
  talkId: string,
): TalkTab | null {
  const base = `/talks/${talkId}`;
  if (pathname === base) {
    return "overview";
  }

  const sections: ReadonlyArray<readonly [TalkTab, string]> = [
    ["activities", `${base}/activities`],
    ["roster", `${base}/roster`],
    ["slides", `${base}/slides`],
  ];
  for (const [tab, sectionPath] of sections) {
    if (pathname === sectionPath || pathname.startsWith(`${sectionPath}/`)) {
      return tab;
    }
  }
  return null;
}
