import { Button } from "@forge/ui/button";
import Link from "next/link";

export default function Sponsor() {
    return (
        <main className="flex flex-col justify-center mx-auto w-full md:w-[800px] mb-40">
            <h1 className="text-4xl sm:text-5xl font-bold text-center pt-20 mb-2 sm:mb-10 tracking-tighter">
                Want to sponsor <span className="text-[hsl(var(--primary-lighter))]">Knight Hacks?</span>
            </h1>
            <p className="text-sm sm:text-base text-center p-2 tracking-tighter">
                Every year, <b className="text-[hsl(var(--primary-lighter))]">
                    Knight Hacks
                </b> hosts a 36-hour event at the
                University of Central Florida, where students come together
                to create and learn, by developing a project over the
                course of a weekend. We aim to create a 
                <b className="text-[hsl(var(--primary-lighter))]"> {" "}
                diverse, welcoming, and inclusive community</b> for 
                anyone interested in technology.
            </p>
            <p className="text-sm sm:text-base text-center p-2 tracking-tighter">
                Companies who sponsor us are able to mentor, teach, and recruit {" "}
                <b className="text-[hsl(var(--primary-lighter))]">
                    around 600+
                </b> brilliant students with a passion for building, and
                gain brand recognition. See below to learn more about us!
            </p>
            <div className="flex flex-col justify-center mx-auto mt-6">
                <p className="text-sm sm:text-base text-center p-2 tracking-tighter">
                    <i>View how <b className="text-[hsl(var(--primary-lighter))]">
                        Knight Hacks
                    </b>
                        {" "} impacts those who attend:
                    </i>
                </p>
                <iframe
                    width="560"
                    height="315"
                    src="https://www.youtube.com/embed/9LPTM5MrSc0?si=hBQKQ0tOL-9k_ahl"
                    className="w-full h-[200px] sm:w-[560px] sm:h-[315px]"
                ></iframe>
            </div>
            <div className="flex flex-col justify-center mx-auto mt-10">
                <p className="text-sm sm:text-base text-center p-2 tracking-tighter">
                    <i>Want to make dreams? View how you can help make {" "}
                        <b className="text-[hsl(var(--primary-lighter))]">Knight Hacks</b>
                        {" "} possible:
                    </i>
                </p>
                <div className="flex flex-col justify-center mx-auto">
                        <Link href={"/sponsorship-packet.pdf"}>
                            <Button>
                                <h1 className="font-bold text-2xl">
                                    Sponsorship Package
                                </h1>
                            </Button>
                        </Link>
                </div>
            </div>
        </main>
    );
}