import type { Metadata } from "next";
import { Roboto_Slab, IBM_Plex_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body-sans",
  subsets: ["latin"],
  display: "swap",
});

const THEME_INIT = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t="dark";}var d=t==="dark";var h=document.documentElement;h.classList.toggle("dark",d);h.classList.toggle("light",!d);}catch(e){document.documentElement.classList.add("dark");}})();`;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://meridian.example.com";

export const metadata: Metadata = {
  title: {
    default: "MERIDIAN | Elite Fitness Management",
    template: "%s | MERIDIAN",
  },
  description:
    "MERIDIAN is the precision-built management system for elite fitness and bodybuilding facilities — classes, coaching, nutrition, and analytics in one industrial-grade platform.",
  icons: {
    icon: "/img/logo.svg",
    shortcut: "/img/logo.svg",
    apple: "/img/logo.svg",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "MERIDIAN",
    title: "MERIDIAN | Elite Fitness Management",
    description:
      "Precision-built management for elite fitness facilities — classes, coaching, nutrition, and analytics.",
    images: [
      {
        url: "/img/logo.svg",
        width: 512,
        height: 512,
        alt: "MERIDIAN",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "MERIDIAN | Elite Fitness Management",
    description:
      "Precision-built management for elite fitness facilities — classes, coaching, nutrition, and analytics.",
    images: ["/img/logo.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  category: "technology",
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${robotoSlab.variable} ${ibmPlexMono.variable} ${plusJakartaSans.variable} ${inter.variable} h-full antialiased dark`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-slate-primary">
        {children}
      </body>
    </html>
  );
}