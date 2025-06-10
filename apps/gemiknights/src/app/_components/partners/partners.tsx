import { BackgroundGradientAnimation } from "../ui/background-gradient-animation";
import { Card, CardContent } from "../ui/card";
import { partnerLogos } from "./partnerLogos";

const Partners = () => {
  return (
    <div
      id="partners"
      className="flex h-screen w-full flex-col items-center justify-center gap-2 px-4 sm:gap-3 sm:px-6 md:gap-4 md:px-8"
    >
      <span className="tk-forma-djr-display mb-6 text-3xl font-bold sm:mb-8 sm:text-4xl md:mb-10 md:text-5xl">
        Partners
      </span>
      <div className="xs:grid-cols-2 xs:max-w-[90%] grid w-full max-w-[95%] grid-cols-1 gap-3 sm:max-w-[85%] sm:gap-4 md:max-w-[80%] md:grid-cols-2 md:gap-6 lg:max-w-6xl lg:grid-cols-4">
        {partnerLogos.map((LogoPair, idx) => (
          <Card
            key={idx}
            className="group relative w-full overflow-hidden rounded-xl border-none bg-transparent px-4 hover:bg-transparent sm:px-6 md:px-8 lg:px-10"
          >
            <div className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <BackgroundGradientAnimation
                className="h-full w-full"
                size="100%"
                interactive={false}
                containerClassName="w-full h-full"
                blendingValue="hard-light"
              />
            </div>
            <CardContent>
              <div className="xs:h-16 relative h-12 w-full transition-transform duration-300 group-hover:scale-110 sm:h-20 md:h-24 lg:h-28">
                <LogoPair.white
                  className="absolute inset-0 h-full w-full opacity-100 transition-opacity duration-300 group-hover:opacity-0"
                  width="100%"
                  height="100%"
                />
                <LogoPair.color
                  className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  width="100%"
                  height="100%"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Partners;
