import Carousel from "./Carousel";
import MainContent from "./MainContent";
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
      className="absolute flex h-auto w-full justify-center bg-gray-700"
    >
      <div id="content" className="w-[1600px]">
        <div id="navbar-container" className="mt-4">
          <Navbar />
        </div>
        <Carousel slides={slides} />
        <MainContent />
      </div>
    </div>
  );
}
