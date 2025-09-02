import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Carousel from "../_components/carousel";

export default function About() {
  const slides = [
    { src: "/hike.jpg", alt: "Me Hiking" },
    { src: "/kh.webp", alt: "KnightHacks Group photo" },
    { src: "/kerrypark.jpg", alt: "Me and my brother in Seattle" },
  ];

  return (
    <main className="relative min-h-screen">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-no-repeat blur-md"
        style={{ backgroundImage: "url('/blue_road.jpg')" }}
      />
      <div className="absolute inset-0 -z-10 bg-slate-900/50" />

      <Link
        href="/ethan-mckissic"
        className="absolute top-20 left-20 z-10 text-white flex items-center gap-4 hover:opacity-80"
      >
        <ArrowLeft className="w-10 h-10" />
      </Link>

      <div className="flex flex-col items-center justify-center pt-20 animate-fade-in">
        <h1 className="text-4xl md:text-6xl mb-8 focus:outline-none focus:ring-2 focus:ring-white/40 rounded italic drop-shadow-lg">
          about me
        </h1>

        <div className="max-w-4xl w-full px-4">
          <Carousel slides={slides} heightClass="h-72 md:h-96" />
        </div>

        <div className="max-w-4xl mx-auto px-4 mt-12">
          <p className="text-white text-lg md:text-xl leading-relaxed text-center tracking-wide">
            I’m a third-year Computer Science student at the University of Central Florida with a knack
            for full-stack development. I enjoy bringing ideas to life, solving complex problems, and
            helping others through software. I also love taking things apart, tinkering, and seeing my
            imagination come alive! Outside of the software world, I’m an avid gamer and reader with a
            passion for exploring creative works, whether they’re digital or real. I also enjoy
            photography, discovering new places, and diving into different cultures and geographies to
            broaden my understanding of the world! These interests keep me curious, creative, and
            inspired, which are qualities that I want to reflect in my work as a developer.
          </p>
        </div>
      </div>
    </main>
  );
}
