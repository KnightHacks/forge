import Hero from "./_components/hero/hero";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[url('/background.svg')] bg-cover">
      <Hero />
    </div>
  );
}
