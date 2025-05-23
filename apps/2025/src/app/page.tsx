import Hero from "./_components/hero/hero";
import Tracks from "./_components/tracks/tracks";

export default function Home() {
  return (
    <div className="bg-[url('/background.svg')] bg-cover">
      <Hero />
      <Tracks />
    </div>
  );
}
