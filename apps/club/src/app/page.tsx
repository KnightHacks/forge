import About from "./_components/landing/about";
import Discover from "./_components/landing/discover";
import Hero from "./_components/landing/hero";
import Impact from "./_components/landing/Impact";
import Sponsors from "./_components/landing/sponsors";

export default function HomePage() {
  return (
    <div>
      <div className="font-bold">
        <Hero />
        <About />
        <Impact />
        <Sponsors />
        <Discover />
      </div>
    </div>
  );
}
