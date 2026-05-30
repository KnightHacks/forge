import About from "./_components/about/about";
import DiscordCTAButton from "./_components/discord/discord";
import FAQ from "./_components/faq/faq";
import Logo from "./_components/graphics/logo";
import Partners from "./_components/partners/partners";
import Register from "./_components/register/registerButton";

export default function HomePage() {
  return (
    <div className="font-bubblegum flex w-full flex-col items-center justify-center text-4xl">
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 pt-24">
        <div className="animate-fade-up">
          <Logo />
        </div>
        <div
          className="animate-fade-up"
          style={{ animationDelay: "0.25s", opacity: 0 }}
        >
          <Register />
        </div>
      </div>

      <div className="flex w-full flex-col text-white">
        <div className="flex min-h-screen items-center justify-center py-24">
          <About />
        </div>
        <div className="flex min-h-screen items-center justify-center py-24">
          <FAQ />
        </div>
        <div className="flex w-full items-center justify-center gap-4 py-16">
          <Partners />
        </div>
        <div className="flex min-h-[50vh] items-center justify-center">
          <DiscordCTAButton />
        </div>
      </div>
    </div>
  );
}
