import Hero from "./_components/hero/hero";
import Tracks from "./_components/tracks/tracks";

export default function Home() {
  return (
    <div className="flex flex-col items-center bg-[url('/background.svg')] bg-cover pt-20">
      <Hero />
      <Tracks />
    </div>
  );
}
