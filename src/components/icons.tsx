import type { ReactElement } from "react";

export type IconName =
  | "logo" | "chat" | "grid" | "download" | "server" | "gauge" | "play" | "pause"
  | "stop" | "x" | "check" | "copy" | "trash" | "refresh" | "bolt" | "layers"
  | "shield" | "search" | "terminal" | "cpu" | "net" | "send" | "alert" | "folder"
  | "key" | "arrowRight" | "plus" | "clock" | "box" | "sparkle" | "sliders" | "memory" | "info";

const P: Record<IconName, ReactElement> = {
  logo: (
    <>
      <path d="M12 2l8.5 5v10L12 22l-8.5-5V7z" />
      <circle cx="12" cy="12" r="2.3" />
      <path d="M12 9.7V7M12 14.3v2.7M9.9 10.8l-2.4-1.4M14.1 10.8l2.4-1.4M9.9 13.2l-2.4 1.4M14.1 13.2l2.4 1.4" />
    </>
  ),
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </>
  ),
  server: (
    <>
      <rect x="2" y="2.5" width="20" height="8" rx="2" />
      <rect x="2" y="13.5" width="20" height="8" rx="2" />
      <path d="M6 6.5h.01M6 17.5h.01M10 6.5h2M10 17.5h2" />
    </>
  ),
  gauge: (
    <>
      <path d="M20.3 18a9 9 0 1 0-16.6 0" />
      <path d="M12 13l3.8-3.8" />
      <circle cx="12" cy="13" r="1" />
    </>
  ),
  play: <path d="M7 5l12 7-12 7z" />,
  pause: <path d="M9 5v14M15 5v14" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="1.5" />,
  x: <path d="M18 6L6 18M6 6l12 12" />,
  check: <path d="M20 6L9 17l-5-5" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.9-6.6" />
      <path d="M21 3v6h-6" />
    </>
  ),
  bolt: <path d="M13 2L3 14h8l-1 8 11-13h-8l0-7z" />,
  layers: (
    <>
      <path d="M12 2L2 7l10 5 10-5z" />
      <path d="M2 12l10 5 10-5" />
      <path d="M2 17l10 5 10-5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
      <path d="M9 11.5l2 2 4-4.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  terminal: (
    <>
      <path d="M4 17l6-6-6-6" />
      <path d="M12 19h8" />
    </>
  ),
  cpu: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M7 2v3M17 2v3M7 19v3M17 19v3" />
    </>
  ),
  net: (
    <>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <path d="M12 20h.01" />
      <path d="M2 8.82a15 15 0 0 1 20 0" />
    </>
  ),
  send: (
    <>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4z" />
    </>
  ),
  alert: (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  folder: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M11 12L21 2M16 7l3 3M19 4l2 2" />
    </>
  ),
  arrowRight: <path d="M5 12h14M12 5l7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>
  ),
  box: (
    <>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v9" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1 14h6M9 8h6M17 16h6" />
    </>
  ),
  memory: (
    <>
      <rect x="2" y="6.5" width="20" height="10" rx="1.5" />
      <path d="M6 16.5v3M10 16.5v3M14 16.5v3M18 16.5v3" />
      <path d="M6 10h2.5v3H6zM11 10h2.5v3H11zM16 10h2.5v3H16z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
};

export function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {P[name]}
    </svg>
  );
}
