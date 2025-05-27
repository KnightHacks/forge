import Hero from "./_components/hero/hero";
import Tracks from "./_components/tracks/tracks";
import About from "./_components/about/about";

export default function Home() {
  return (
    <div className="bg-[url('/background.svg')] bg-cover">
      <Hero />
      <About />
      <Tracks />
    </div>
  );
}
