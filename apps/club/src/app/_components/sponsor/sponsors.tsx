import Image from "next/image";
import { PARTNERS, SPONSORS } from "./constants";

const Sponsors = () => {
  const sponsor_list = [...SPONSORS].sort((a, b) => a.name.localeCompare(b.name));
  const partner_list = [...PARTNERS].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="font-inter min-h-screen px-30 lg:px-60">
      <h2 className="text-(--club-gold) text-[40px]">Our Sponsors</h2>

      <div className="grid grid-cols-4 gap-6 pb-22">
        {sponsor_list.map(sponsor =>
          <a
            key={sponsor.name}
            href={sponsor.link}
            className="flex justify-center w-full h-24 bg-[#2A153E66] rounded border-2 border-[#FFFFFF1A] drop-shadow-[#FFFFFF0D]">
            <Image
              src={sponsor.logo}
              alt={`${sponsor.name} logo`}
              width="75"
              height="75"
              className="object-contain"
            >
            </Image>
          </a>)
        }
      </div>

      <h2 className="text-(--club-gold) text-[40px]">Our Partners</h2>
      <div className="grid grid-cols-4 gap-6 pb-22">
        {partner_list.map(partner =>
          <a
            key={partner.name}
            href={partner.link}
            className="flex justify-center w-full h-24 bg-[#2A153E66] rounded border-2 border-[#FFFFFF1A] drop-shadow-[#FFFFFF0D]">
            <Image
              src={partner.logo}
              alt={`${partner.name} logo`}
              width="75"
              height="75"
              className="object-contain"
            >
            </Image>
          </a>)
        }
      </div>


    </div>
  );
};

export default Sponsors;
