import About from "./_components/about/about";
import Hero from "./_components/hero/hero";
import PartnersFaqWrapper from "./_components/partners-faq-wrapper";
import Sponsors from "./_components/sponsors/sponsors";
import Tracks from "./_components/tracks/tracks";
import Footer from "./_components/footer/footer";

export default function Home() {
  return (
    <div className="bg-[url('https://cdn.jsdelivr.net/gh/KnightHacks/forge@main/apps/2025/public/background.svg')] bg-cover bg-center bg-no-repeat min-h-full md:bg-cover md:bg-top">
      <link rel="preload" as="image" href="/about-graphic.svg" />
      <link rel="preload" as="image" href="/comic.svg" />
      <link rel="" as="image" href="https://cdn.jsdelivr.net/gh/KnightHacks/forge@main/apps/2025/public/background.svg" />
      <link rel="preload" as="image" href="/khFull.svg" />
      <link rel="preload" as="image" href="/sponsorSectionSvgs/spikeything.svg" />
      <link rel="preload" as="image" href="/AboutComic.svg" />
      
      <main id="main-content" className="relative z-10">
        <Hero />
        <About />
        <Tracks />
        <Sponsors />
        <PartnersFaqWrapper />
      </main>
      <Footer />
    </div>
  );
}
