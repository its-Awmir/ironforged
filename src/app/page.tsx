import type { Metadata } from "next";
import LandingContent from "@/components/landing/LandingContent";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://meridian.example.com";

export const metadata: Metadata = {
  title: "MERIDIAN | Elite Fitness Management",
  description:
    "Industrial-grade management system for elite fitness and bodybuilding facilities. Classes, coaching, nutrition, analytics, and subscriptions — engineered for absolute performance.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MERIDIAN | Elite Fitness Management",
    description:
      "Precision-built management for elite fitness facilities — classes, coaching, nutrition, and analytics.",
    type: "website",
    url: siteUrl,
    siteName: "MERIDIAN",
    locale: "en_US",
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
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "MERIDIAN",
            url: siteUrl,
            logo: `${siteUrl}/img/logo.svg`,
            description:
              "Industrial-grade management system for elite fitness and bodybuilding facilities — classes, coaching, nutrition, and analytics.",
            sameAs: [],
          }),
        }}
      />
      <LandingContent />
    </>
  );
}