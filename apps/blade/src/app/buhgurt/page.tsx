import ParticleComponent from "./components/Particles";
import { socials } from "./components/SocialData";
import Social from "./components/Social";

export default function Gurt() {
    return (
        <div className="flex flex-col bg-auto min-h-screen">
            <div className="absolute inset-0 z-0 blur-xs">
                <ParticleComponent />
            </div>
            
            <main className="h-screen flex flex-row justify-center items-center z-20">
                <div className="flex flex-col text-center w-full gap-2 fade-in">
                    <p className="text-white text-5xl text-bold flex-flex-row">Josh Sawyer</p>
                    <p className="text-white text-4xl">(again...)</p>
                    <p className="text-white text-lg">(agurt....)</p>
                    <div className="flex flex-row mx-auto">
                        {socials.map((social) => (
                            <Social key={social.key} img={social.img} link={social.link} altText={social.altText} />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}