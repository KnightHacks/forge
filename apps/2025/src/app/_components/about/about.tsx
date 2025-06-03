import AboutSVG from "./about-svg";
import AboutComicSVG from "./about-comic-svg";
import Logo from "../logo";
import TextBox from "../textbox";

export default function About() {
  return (
    <div className="z-10 flex w-full justify-center px-4">
      <div className="relative w-[99%] md:w-[60%]">
        <TextBox width="100%" height="100%">
          <p className="text-center text-lg md:text-2xl">
            Welcome to the 2025 edition of the <strong>Hack Club</strong>{" "}
            website! This site is a collaborative effort by Hack Clubbers around
            the world, showcasing our community's creativity and innovation.
            Dive in to explore our projects, learn more about our initiatives,
            and see how you can get involved!
          </p>
        </TextBox>
        <Logo size={275} />
        <AboutSVG className="my-[10%] h-auto w-full" />
        <AboutComicSVG className="my-[10%] h-auto w-full" />
      </div>
    </div>
  );
}
