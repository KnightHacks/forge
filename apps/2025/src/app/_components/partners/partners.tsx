import PartnerPosters from "./partnerPosters";
import PartnersTitle from "./partnersTitle";

const partners = () => {
  return (
    <div className="mb-16 h-auto w-full pt-40 sm:mb-20 md:mb-24 lg:mb-32 xl:mb-40">
      <PartnersTitle />
      <PartnerPosters />
    </div>
  );
};

export default partners;
