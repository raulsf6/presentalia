import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/**
 * Shared frame for the navigation icon set: rounded 2.2px strokes, sized by
 * the caller through className. Icons are decorative — every nav item shows
 * a label next to its icon.
 */
function SvgIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PresentationIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="4" width="18" height="12" rx="2.5" />
      <path d="M12 16v4" />
      <path d="M8.5 20h7" />
    </SvgIcon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 11.2 12 4l8 7.2" />
      <path d="M6.3 9.9V20h11.4V9.9" />
    </SvgIcon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 20v-7" />
      <path d="M12 20V5" />
      <path d="M19 20v-4" />
      <path d="M3.5 20h17" />
    </SvgIcon>
  );
}

export function QuizIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.4 12.2 2.5 2.5 4.9-5.2" />
    </SvgIcon>
  );
}

export function TextIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 5.5h16v10.5H9.5L5 20v-4H4z" />
      <path d="M8 9h8" />
      <path d="M8 12.5h5" />
    </SvgIcon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.6 20c.7-3.3 2.8-5.2 5.4-5.2s4.7 1.9 5.4 5.2" />
      <path d="M15.4 5.5a3.2 3.2 0 0 1 0 5" />
      <path d="M17.3 14.8c1.9.7 3 2.4 3.4 5.2" />
    </SvgIcon>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M7 2.75h7l4.25 4.25V20A1.25 1.25 0 0 1 17 21.25H7A1.25 1.25 0 0 1 5.75 20V4A1.25 1.25 0 0 1 7 2.75Z" />
      <path d="M14 2.75v4.5h4.25" />
    </SvgIcon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20c.8-3.6 3.4-5.6 6.5-5.6s5.7 2 6.5 5.6" />
    </SvgIcon>
  );
}

export function UserCogIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="9.5" cy="7.5" r="3" />
      <path d="M3.6 20c.6-3.3 2.9-5 5.9-5 .8 0 1.6.1 2.3.4" />
      <circle cx="17.5" cy="17" r="2.3" />
      <path d="M17.5 13.1v1.5" />
      <path d="M17.5 19.4v1.5" />
      <path d="m14.1 15 1.3.8" />
      <path d="m19.6 18.2 1.3.8" />
      <path d="m14.1 19 1.3-.8" />
      <path d="m19.6 15.8 1.3-.8" />
    </SvgIcon>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M9.5 21H6.2A2.2 2.2 0 0 1 4 18.8V5.2A2.2 2.2 0 0 1 6.2 3h3.3" />
      <path d="M15.5 16.5 20 12l-4.5-4.5" />
      <path d="M20 12H9.5" />
    </SvgIcon>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 15.5V4.5" />
      <path d="m7.5 9 4.5-4.5L16.5 9" />
      <path d="M4.5 15v3.5A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5V15" />
    </SvgIcon>
  );
}

export function RemoteIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </SvgIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 5.5v13" />
      <path d="M5.5 12h13" />
    </SvgIcon>
  );
}
