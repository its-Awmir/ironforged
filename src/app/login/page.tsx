import type { Metadata } from "next";
import LoginClient from "./LoginClient";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://meridian.example.com";

export const metadata: Metadata = {
  title: "Athlete Login",
  description:
    "Sign in to your MERIDIAN account to access your classes, coaching, nutrition plan, and performance analytics.",
  alternates: {
    canonical: "/login",
  },
  openGraph: {
    title: "Athlete Login | MERIDIAN",
    description:
      "Sign in to your MERIDIAN account to access classes, coaching, nutrition, and analytics.",
    type: "website",
    url: `${siteUrl}/login`,
    siteName: "MERIDIAN",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Athlete Login | MERIDIAN",
    description:
      "Sign in to your MERIDIAN account to access classes, coaching, nutrition, and analytics.",
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
