import type { Metadata } from "next";
import { Archivo_Black, Geist_Mono, Space_Grotesk } from "next/font/google";

import { LOCALE_COOKIE } from "@/lib/i18n/config";
import "./globals.css";

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Presentalia",
  description:
    "Live companion for AI-agent talks: vote in polls, follow the results, and keep the slides.",
};

/**
 * The root layout stays static so every route keeps its prerendered shell.
 * The request's locale is therefore not available here; this script reads the
 * same cookie (or the browser's languages) in <head>, before first paint, and
 * sets the correct html lang. Page content is still server-rendered in the
 * locale resolved inside each page's Suspense content.
 */
const localeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=(en|es)(?:;|$)/);var l=m?m[1]:null;if(!l){var langs=navigator.languages||[navigator.language||"en"];for(var i=0;i<langs.length;i++){var p=String(langs[i]).toLowerCase().split("-")[0];if(p==="es"||p==="en"){l=p;break}}}document.documentElement.lang=l||"en"}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivoBlack.variable} ${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
