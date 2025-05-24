import Hero from "./_components/hero/hero";
import Tracks from "./_components/tracks/tracks";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[url('/background.svg')] bg-cover">
      <Hero />
      <Tracks />
    </div>
  );
}