import Image from "../../../../node_modules/next/image";
import AnimatedInfo from "./components/AnimatedInfo";
import MotionDiv from "./components/MotionDiv";
import ShootingStars from "./components/ShootingStars";
import Stars from "./components/Stars";

export default function HomePage() {
  return (
    <main className="overflow-x-clip overflow-y-clip overscroll-none">
      <div className="min-w-screen relative min-h-screen bg-black">
        <div className="relative flex h-screen w-screen items-center justify-center">
          <div className="min-w-screen min-h-screen" draggable={false}></div>
          <Image
            src="/noah_img/city.svg"
            alt="Image"
            fill={true}
            style={{
              objectFit: "cover",
              userSelect: "none",
              pointerEvents: "none",
            }}
            className="z-10"
            draggable={false}
          />

          <ShootingStars></ShootingStars>
          <ShootingStars></ShootingStars>
          <ShootingStars></ShootingStars>

          <div className="absolute top-[20%] z-[5] flex h-36 w-36 items-center justify-center rounded-full bg-white shadow-2xl shadow-white md:h-48 md:w-48">
            <div className="animate-float relative mt-28 h-20 w-96 md:h-36">
              <Image
                src="/noah_img/myGoat.png"
                fill={true}
                style={{ objectFit: "cover", pointerEvents: "none" }}
                alt=""
                draggable={false}
              ></Image>
            </div>
          </div>

          <Stars />
          <div className="animate-shrink z-20 flex flex-col items-center gap-2 rounded-lg bg-black/90 p-3 pt-1 font-bold italic text-yellow-300">
            <div> A WEB DEV TEAM APPLICATION BY...</div>
            <div className="relative h-10 w-80 md:h-[3rem] md:w-[24rem] lg:h-[4rem] lg:w-[32rem]">
              <div className="">
                <Image
                  src="/noah_img/name.png"
                  alt="Image"
                  fill={true}
                  style={{ objectFit: "fill", pointerEvents: "none" }}
                  className="z-10"
                ></Image>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="absolute bottom-5 flex w-full animate-pulse items-center justify-center font-bold italic text-yellow-300">
            <div>SCROLL DOWN TO SEE MORE</div>
          </div>
        </div>
      </div>
      <div className="min-w-screen relative z-20 flex h-screen flex-col overflow-clip bg-black md:flex-row">
        <div className="relative w-full flex-[3] border-4 border-gray-900 bg-orange-900">
          <div className="absolute h-full w-full">
            <Image
              src="/noah_img/wave.svg"
              fill
              style={{
                objectFit: "cover",
                objectPosition: "top",
              }}
              alt=""
            ></Image>
          </div>

          <div className="absolute top-0 w-full py-2 text-lg font-bold italic text-yellow-500 md:mt-5 md:text-3xl">
            VIBE CODERS USING AI FOR EVERY SMALL INCONVENIENCE?
          </div>

          <MotionDiv>
            <div>
              <div className="absolute -left-5 bottom-0 h-[40%] w-[50%] md:-left-10 md:h-[60%] md:w-[90%] xl:md:w-[70%] xl:h-[60%]">
                <Image
                  src="/noah_img/megumi.png"
                  alt="Megumi"
                  fill
                  style={{ objectFit: "contain", objectPosition: "bottom" }}
                ></Image>
              </div>
              <div className="animate-mahoraga absolute -bottom-12 right-2 h-[110%] w-[70%] md:-right-[40%] md:bottom-[15%] md:h-[80%] md:w-[160%] lg:h-[60%] lg:w-[160%] xl:-right-[15%] xl:h-[75%] xl:w-[100%]">
                <Image
                  src="/noah_img/mahoraga.png"
                  alt="MahoGPT"
                  fill
                  style={{ objectFit: "contain", objectPosition: "bottom" }}
                ></Image>
              </div>
            </div>
          </MotionDiv>
        </div>
        <div className="relative z-20 flex w-full flex-[5] flex-col justify-center gap-1 border-4 border-gray-900 bg-gray-950 px-2 pt-1">
          <AnimatedInfo></AnimatedInfo>
        </div>
      </div>
    </main>
  );
}
