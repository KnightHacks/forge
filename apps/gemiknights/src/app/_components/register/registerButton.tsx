import Link from "next/link";
import { BackgroundGradientAnimation } from "../ui/background-gradient-animation";
import { Card, CardContent } from "../ui/card";
import { env } from "~/env";

const Register = () => {
    return (
        <div className="flex flex-col items-center justify-center mt-20 tk-peridot-devanagari text-white font-semibold">
            <Link 
                href={`${env.BLADE_URL}/hacker/application`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative inline-block hover:text-[#FBB03B] transition-colors duration-300"
            >
                <Card className="relative z-10 bg-transparent border-none hover:bg-transparent transition-transform duration-500 group-hover:scale-110">
                    <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden rounded-lg">
                        <BackgroundGradientAnimation
                            className="w-full h-full"
                            size="100%"
                            interactive={false}
                            containerClassName="w-full h-full"
                            blendingValue="hard-light"
                        />
                    </div>
                    <CardContent className="relative z-10">
                        <span className="sm:text-3xl md:text-5xl text-2xl font-semibold">Register</span>
                    </CardContent>
                </Card>
            </Link>
        </div>
    );
};
export default Register;