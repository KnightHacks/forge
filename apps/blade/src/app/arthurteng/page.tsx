"use client";
export default function page() {
  const playJakingit = () => {
    const audio = new Audio("/audio/im-jaking-it-made-with-Voicemod.mp3");
    audio.loop = true;
    void audio.play();
  };
  return (
    <div id="content-container" className="bg-blue-300">
      <div id="content">
        <div id="nav-bar-container"></div>
        <div id="main-content-container">
          <div id="left-ad-container"></div>
          <div id="essay-container"></div>
          <div id="right-ad-container"></div>
        </div>
      </div>
    </div>
  );
}
