import type { Metadata } from "next";
import LandingContent from "@/components/landing/LandingContent";

export const metadata: Metadata = {
  title: "MERIDIAN | Elite Fitness Management",
  description:
    "Industrial-grade management system for elite fitness and bodybuilding facilities. Classes, coaching, nutrition, analytics, and subscriptions — engineered for absolute performance.",
  openGraph: {
    title: "MERIDIAN | Elite Fitness Management",
    description:
      "Precision-built management for elite fitness facilities — classes, coaching, nutrition, and analytics.",
    type: "website",
  },
};

export default function HomePage() {
  return <LandingContent />;
}