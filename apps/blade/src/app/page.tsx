import Image from "../../../../node_modules/next/image";
import Stars from "./components/Stars";

export default function HomePage() {
  return (
    <main className="overflow-x-clip">
      <div className="min-w-screen min-h-screen bg-black">
        <div className="relative flex h-screen w-screen items-center justify-center">
          <div className="min-w-screen min-h-screen" draggable={false}></div>
          <Image
            src="/noah_img/city.svg"
            alt="Image"
            fill={true}
            style={{ objectFit: "cover" }}
            className="z-10"
          />

          <div className="absolute top-[20%] z-[5] flex h-36 w-36 items-center justify-center rounded-full bg-white shadow-2xl shadow-white md:h-48 md:w-48">
            <div className="animate-float relative mt-28 h-20 w-96 md:h-36">
              <Image
                src="/noah_img/myGoat.png"
                fill={true}
                style={{ objectFit: "cover" }}
                alt=""
              ></Image>
            </div>
          </div>

          <Stars />
          <div className="z-20 flex flex-col items-center gap-2 rounded-lg bg-black/90 p-3 pt-1 font-bold italic text-yellow-300">
            <div>WEB DEV TEAM APPLICATION BY...</div>
            <div className="relative h-10 w-80 md:h-[3rem] md:w-[24rem] lg:h-[4rem] lg:w-[32rem]">
              <Image
                src="/noah_img/name.png"
                alt="Image"
                fill={true}
                style={{ objectFit: "fill" }}
                className="z-10"
              ></Image>
            </div>
          </div>
        </div>
      </div>
      <div className="min-w-screen min-h-screen bg-black"></div>
    </main>
  );
}
