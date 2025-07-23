import Faq from "./faq/faq";
import Partners from "./partners/partners";
import PipesBackground from "./pipes-background";
import SidewalkBackground from "./sidewalk-background";

export default function PartnersFaqWrapper() {
  return (
    <>
      <SidewalkBackground />
      <div className="relative">
        <PipesBackground />
        <Partners />
        <Faq />
      </div>
    </>
  );
}
