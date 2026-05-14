import { Button } from "@forge/ui/button";

const Hero = () => {
  return (
    <div className="font-inter uppercase min-h-screen flex flex-col justify-center items-center">
      <h1 className="font-black text-[64px]">Our Supporters</h1>
      <h3 className="text-[24px] text-(--club-gold)">Sponsors & Partners</h3>

      <div className="-rotate-1 relative border-4 border-white max-w-4xl mx-20 mt-14 mb-17 py-11 px-16">
        <div className="absolute top-2.5 left-2.5 border-t-4 border-l-4 border-white w-8 h-8 ">
        </div>
        <p className="text-[20px]">Our sponsors make it possible for us to unite developers, designers, and builders across Florida and beyond. Hackers form meaningful connections with our sponsors that last well past the hackathon weekend.</p>
        <div className="absolute right-2.5 bottom-2.5 border-b-4 border-r-4 border-white w-8 h-8 ">
        </div>

      </div>
      <Button asChild className="min-w-57 h-17 club-button club-button-light font-black!">
        <a href="https://blade.knighthacks.org/sponsor">Become a Sponsor →</a>
      </Button>
    </div>
  )
};

export default Hero;
