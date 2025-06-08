import FAQ from "./_components/faq/faq";
import GithubBSVG from "./_components/graphics/githubB";
import GithubWSVG from "./_components/graphics/githubW";
import GeminiSVG from "./_components/graphics/gemini";
import GeminiWSVG from "./_components/graphics/geminiW";
import MLHSVG from "./_components/graphics/mlh";
import MLHWSVG from "./_components/graphics/mlhW";

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center w-full h-screen items-center text-4xl text-white tk-forma-djr-display">
      <span className="tk-peridot-devanagari">lalallala LALALALA</span>
      <span className="tk-forma-djr-display">lalallala LALALA</span>
      <FAQ />
      <div className="flex gap-4 items-center w-full justify-center">
        <GithubBSVG />
        <GithubWSVG />
        <GeminiSVG />
        <GeminiWSVG />
        <MLHSVG />
        <MLHWSVG />
      </div>
    </div>
  );
}
