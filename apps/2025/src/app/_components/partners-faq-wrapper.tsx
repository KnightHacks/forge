import Faq from "./faq/faq";
import Partners from "./partners/partners";

export default function PartnersFaqWrapper() {
  return (
    <>
      <div className="relative">
        <Partners />
        <Faq />
      </div>
    </>
  );
}
