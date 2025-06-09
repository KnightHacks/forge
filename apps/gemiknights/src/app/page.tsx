import FAQ from "./_components/faq/faq";
import Partners from "./_components/partners/partners";
import About from "./_components/about/about";
import Logo from "./_components/graphics/logo";
import Register from "./_components/register/registerButton";

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center w-full items-center text-4xl tk-forma-djr-display ">
      <div className="flex flex-col justify-center items-center w-full h-screen">
        <Logo />
        <div>
          <Register />
        </div>
      </div>
      <div className="w-full flex flex-col text-white">
        <div className="min-h-screen flex items-center justify-center">
          <About />
        </div>
        <div className="min-h-screen flex items-center">
          <FAQ />
        </div>
        <div className="flex gap-4 items-center w-full justify-center">
          <Partners />
        </div>
      </div>
    </div>
  );
}
