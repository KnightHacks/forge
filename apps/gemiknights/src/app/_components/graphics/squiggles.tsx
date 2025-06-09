import Image from "next/image";

const Squiggles = () => {
    return (
        <div className="fixed inset-0 pointer-events-none z-[-1]">
            {/* Top Left */}
            <div className="absolute top-0 left-0 -translate-x-1/4 translate-y-3/5 opacity-50">
                <Image
                    src="/Asset 4.svg"
                    alt="Decorative squiggle"
                    width={200}
                    height={200}
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Top Right */}
            <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 opacity-50">
                <Image
                    src="/Asset 5.svg"
                    alt="Decorative squiggle"
                    width={200}
                    height={200}
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Bottom Left */}
            <div className="absolute bottom-0 left-0 translate-x-1/4 translate-y-1/4 opacity-50">
                <Image
                    src="/Asset 6.svg"
                    alt="Decorative squiggle"
                    width={200}
                    height={200}
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Bottom Right */}
            <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 opacity-50">
                <Image
                    src="/Asset 8.svg"
                    alt="Decorative squiggle"
                    width={300}
                    height={300}
                    className="w-full h-full object-contain"
                />
            </div>
        </div>
    );
};

export default Squiggles; 