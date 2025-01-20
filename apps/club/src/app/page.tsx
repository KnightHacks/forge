import About from "./_components/landing/about";
import Hero from "./_components/landing/hero";

export default function HomePage() {
  return (
    <div>
      <div className="font-bold">
        <Hero />
        <About />
      </div>
    </div>
  );
}
