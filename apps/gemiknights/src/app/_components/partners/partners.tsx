import { partnerLogos } from "./partnerLogos";
import { Card, CardContent } from "../ui/card";
import { BackgroundGradientAnimation } from "../ui/background-gradient-animation";

const Partners = () => {
    return (
        <div className="flex flex-col items-center justify-center w-full gap-4">
            <span className="tk-peridot-devanagari text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold mb-4 xs:mb-6 sm:mb-8 md:mb-10">
                Partners
            </span>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-6xl px-2 sm:px-0">
                {partnerLogos.map((LogoPair, idx) => (
                    <Card key={idx} className="group relative bg-transparent border-none hover:bg-transparent rounded-xl overflow-hidden w-full px-10">
                        <div className="absolute inset-0 w-full h-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <BackgroundGradientAnimation
                                className="w-full h-full"
                                size="100%"
                                interactive={false}
                                containerClassName="w-full h-full"
                                blendingValue="hard-light"
                            />
                        </div>
                        <CardContent className="p-10 xs:p-4 sm:p-6 flex items-center justify-center relative z-10 w-full h-full min-h-[64px] xs:min-h-[80px] sm:min-h-[96px] md:min-h-[110px]">
                            <div className="relative w-full h-16 xs:h-20 sm:h-24 md:h-28 transition-transform duration-300 group-hover:scale-110">
                                <LogoPair.white className="absolute inset-0 w-full h-full transition-opacity duration-300 group-hover:opacity-0 opacity-100" width="100%" height="100%" />
                                <LogoPair.color className="absolute inset-0 w-full h-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" width="100%" height="100%" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default Partners;