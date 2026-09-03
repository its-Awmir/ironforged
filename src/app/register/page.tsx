import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://meridian.example.com";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Join MERIDIAN and create your athlete profile to start training, tracking progress, and accessing the premier fitness management platform.",
  alternates: {
    canonical: "/register",
  },
  openGraph: {
    title: "Create Account | MERIDIAN",
    description:
      "Join MERIDIAN and create your athlete profile to start training and tracking progress.",
    type: "website",
    url: `${siteUrl}/register`,
    siteName: "MERIDIAN",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Create Account | MERIDIAN",
    description:
      "Join MERIDIAN and create your athlete profile to start training and tracking progress.",
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
