import { partnerLogos } from "./partnerLogos";
import { Card, CardContent } from "../ui/card";
import { BackgroundGradientAnimation } from "../ui/background-gradient-animation";

const Partners = () => {
    return (
        <div className="flex flex-col items-center justify-center w-full gap-4">
            <span className="tk-peridot-devanagari text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8 md:mb-10">
                Partners
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl">
                {partnerLogos.map((LogoPair, idx) => (
                    <Card key={idx} className="group relative bg-transparent border-none hover:bg-transparent rounded-xl overflow-hidden" style={{ minHeight: 110 }}>
                        <div className="absolute inset-0 w-full h-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <BackgroundGradientAnimation
                                className="w-full h-full"
                                size="100%"
                                interactive={false}
                                containerClassName="w-full h-full"
                                blendingValue="hard-light"
                            />
                        </div>
                        <CardContent className="p-6 flex items-center justify-center relative z-10 w-full h-full">
                            <div className="relative w-full h-24 transition-transform duration-300 group-hover:scale-110">
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