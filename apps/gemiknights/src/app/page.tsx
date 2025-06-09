import FAQ from "./_components/faq/faq";
import Partners from "./_components/partners/partners";
import About from "./_components/about/about";
import Logo from "./_components/graphics/logo";

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center w-full items-center text-4xl tk-forma-djr-display mt-20 pt-10">
      <Logo />
      <div className="text-white w-full">
        <About />
        <FAQ />
        <div className="flex gap-4 items-center w-full justify-center">
          <Partners />
        </div>
      </div>
    </div>
  );
}
