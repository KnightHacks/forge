import Carousel from "./Carousel";
import MainContent from "./MainContent";
import Navbar from "./Navbar";

export default function page() {
  const slides = [
    "/images/image5.gif",
    "/images/exploding-cat-cat-blowing-up.gif",
    "/images/image4.gif",
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
