import About from "./_components/about/about";
import FAQ from "./_components/faq/faq";
import Logo from "./_components/graphics/logo";
import Partners from "./_components/partners/partners";
import Register from "./_components/register/registerButton";
import DiscordCTAButton from "./_components/discord/discord";

export default function HomePage() {
  return (
    <div className="tk-forma-djr-display flex w-full flex-col items-center justify-center text-4xl">
      <div className="flex h-screen w-full flex-col items-center justify-center gap-6">
        <div className="animate-fade-up">
          <Logo />
        </div>
        <div className="animate-fade-up">
          <Register />
        </div>
      </div>

      <div className="flex w-full flex-col text-white">
        <div className="flex min-h-screen items-center justify-center">
          <About />
        </div>
        <div className="flex min-h-screen items-center">
          <FAQ />
        </div>
        <div className="flex w-full items-center justify-center gap-4">
          <Partners />
        </div>
        <div className="flex min-h-screen items-center justify-center">
          <DiscordCTAButton />
        </div>
      </div>
    </div>
  );
}
