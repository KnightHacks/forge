"use client";
export default function page() {
  // const playJakingit = () => {
  //   const audio = new Audio("/audio/im-jaking-it-made-with-Voicemod.mp3");
  //   audio.loop = true;
  //   void audio.play();
  // };
  return (
    <div
      id="content-container"
      className="absolute flex h-screen w-screen justify-center bg-gray-700"
    >
      <div id="content" className="w-[1900px]">
        <div id="navbar-container" className="mt-4">
          <div
            id="navbar"
            className="flex h-28 items-center justify-evenly rounded-sm bg-gray-800 text-lg"
          >
            <a href="/">Home</a>
            <p>|</p>
            <a href="/">About</a>
            <p>|</p>
            <a href="/">Contact</a>
            <p>|</p>
            <a href="/">Github</a>
            <p>|</p>
            <a href="/">LinkedIn</a>
            <p>|</p>
            <a href="/">Resume</a>
            <p>|</p>
            <a href="/">Website</a>
          </div>
        </div>
        <div id="main-content-container">
          <div id="left-ad-container"></div>
          <div id="essay-container"></div>
          <div id="right-ad-container"></div>
        </div>
      </div>
    </div>
  );
}
