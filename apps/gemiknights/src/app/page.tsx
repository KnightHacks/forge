import FAQ from "./_components/faq/faq";
import Partners from "./_components/partners/partners";

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center w-full items-center text-4xl text-white tk-forma-djr-display">
      <span className="tk-peridot-devanagari">lalallala LALALALA</span>
      <span className="tk-forma-djr-display">lalallala LALALA</span>
      <FAQ />
      <div className="flex gap-4 items-center w-full justify-center">
        <Partners />
      </div>
    </div>
  );
}
