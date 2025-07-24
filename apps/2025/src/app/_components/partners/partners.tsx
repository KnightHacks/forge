import PartnerPosters from "./partnerPosters";
import PartnersTitle from "./partnersTitle";

const partners = () => {
  return (
    <div className="flex w-full justify-center">
      <div
        id="partners"
        className="mb-16 h-auto w-[90%] sm:mb-20 md:mb-24 lg:mb-32 xl:mb-40"
      >
        <PartnersTitle />
        <PartnerPosters />
      </div>
    </div>
  );
};

export default partners;
