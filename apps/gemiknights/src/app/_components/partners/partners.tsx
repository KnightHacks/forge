import { partnerLogos } from "./partnerLogos";
import { Card, CardContent } from "../ui/card";
import { BackgroundGradientAnimation } from "../ui/background-gradient-animation";

const Partners = () => {
    return (
        <div className="flex flex-col items-center justify-center w-full h-screen gap-2 sm:gap-3 md:gap-4 px-4 sm:px-6 md:px-8">
            <span className="tk-forma-djr-display text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8 md:mb-10">
                Partners
            </span>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 w-full max-w-[95%] xs:max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-6xl">
                {partnerLogos.map((LogoPair, idx) => (
                    <Card key={idx} className="group relative bg-transparent border-none hover:bg-transparent rounded-xl overflow-hidden w-full px-4 sm:px-6 md:px-8 lg:px-10">
                        <div className="absolute inset-0 w-full h-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <BackgroundGradientAnimation
                                className="w-full h-full"
                                size="100%"
                                interactive={false}
                                containerClassName="w-full h-full"
                                blendingValue="hard-light"
                            />
                        </div>
                        <CardContent>
                            <div className="relative w-full h-12 xs:h-16 sm:h-20 md:h-24 lg:h-28 transition-transform duration-300 group-hover:scale-110">
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