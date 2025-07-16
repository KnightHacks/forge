import About from "./_components/about/about";
import Faq from "./_components/faq/faq";
import Hero from "./_components/hero/hero";
import Partners from "./_components/partners/partners";
import Sponsors from "./_components/sponsors/sponsors";
import Tracks from "./_components/tracks/tracks";

export default function Home() {
  return (
    <div className="bg-[url('/background.svg')] bg-cover">
      <main id="main-content" className="relative z-10">
        <Hero />
        <About />
        <Tracks />
        <Sponsors />
        <Partners />
        <Faq />
      </main>
    </div>
  );
}
