import Carousel from "./Carousel";
import Navbar from "./Navbar";

export default function page() {
  // const playJakingit = () => {
  //   const audio = new Audio("/audio/im-jaking-it-made-with-Voicemod.mp3");
  //   audio.loop = true;
  //   void audio.play();
  // };
  const slides = [
    "/images/image1.webp",
    "/images/image2.jpg",
    "/images/image3.webp",
  ];
  return (
    <div
      id="content-container"
      className="absolute flex h-screen w-screen justify-center bg-gray-700"
    >
      <div id="content" className="w-[1900px]">
        <div id="navbar-container" className="mt-4">
          <Navbar />
        </div>
        <div id="carousel-container"></div>
        <Carousel slides={slides} />
        <div id="main-content-container" className="flex h-96 bg-black">
          <div id="left-ad-container"></div>
          <div id="essay-container"></div>
          <div id="right-ad-container"></div>
        </div>
      </div>
    </div>
  );
}
