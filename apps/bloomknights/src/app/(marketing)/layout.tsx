import type { ReactNode } from "react";

import Footer from "../_components/footer/footer";
import AnimatedBirds from "../_components/graphics/AnimatedBirds";
import BloomAssetPreloads from "../_components/graphics/BloomAssetPreloads";
import FloatingFlowers from "../_components/graphics/FloatingFlowers";
import FlowerCursor from "../_components/graphics/Flowercursor";
import ParallaxBackground from "../_components/graphics/ParallaxBackground";
import Squiggles from "../_components/graphics/squiggles";
import Navbar from "../_components/navbar/Navbar";
import { eventJsonLd } from "../seo";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bloom-site-background flex min-h-screen flex-col">
      <BloomAssetPreloads />
      <ParallaxBackground />
      <AnimatedBirds />
      <FloatingFlowers />
      <FlowerCursor />

      <span className="font-dm-sans">
        <Navbar />
      </span>

      <main className="flex-1 pt-8">{children}</main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(eventJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <Squiggles />
      <footer className="mt-auto">
        <Footer />
      </footer>
    </div>
  );
}
