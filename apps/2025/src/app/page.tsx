import Hero from "./_components/hero/hero";
import Tracks from "./_components/tracks/tracks";
import About from "./_components/about/about";
import Faq from "./_components/faq/faq";
import Sponsors from "./_components/sponsors/sponsors";
import Partners from "./_components/partners/partners";

export default function Home() {
  return (
    <div className="bg-[url('/background.svg')] bg-cover">
      <div className="relative z-10">
        <Hero />
        <About />
        <Tracks />
        <Faq />
        <Sponsors />
        <Partners />
      </div>
    </div>
  );
}
