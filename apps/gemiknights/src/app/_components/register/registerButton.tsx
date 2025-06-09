import Link from "next/link";

import { env } from "~/env";
import { BackgroundGradientAnimation } from "../ui/background-gradient-animation";
import { Card, CardContent } from "../ui/card";

const Register = () => {
  return (
    <div className="tk-peridot-devanagari mt-20 flex flex-col items-center justify-center font-semibold text-white">
      <Link
        href={`${env.BLADE_URL}/hacker/application`}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative inline-block transition-colors duration-300 hover:text-[#FBB03B]"
      >
        <Card className="relative z-10 border-none bg-transparent transition-transform duration-500 hover:bg-transparent group-hover:scale-110">
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <BackgroundGradientAnimation
              className="h-full w-full"
              size="100%"
              interactive={false}
              containerClassName="w-full h-full"
              blendingValue="hard-light"
            />
          </div>
          <CardContent className="relative z-10">
            <span className="text-2xl font-semibold sm:text-3xl md:text-5xl">
              Register
            </span>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
};
export default Register;
