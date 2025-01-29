import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daniel Ramirez",
  description: "Application for KnightHacks Dev Team",
};

export default function DanielPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Bg image */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://i.pinimg.com/originals/8e/46/15/8e46150f790fbefe438d9c2767c32ad1.gif')`,
          backgroundSize: "cover",
          margin: "-10px",
          padding: "0",
          filter: "blur(5px)",
        }}
      ></div>

      <div
        className="min-h-screen flex flex-col justify-center items-center p-6"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          color: "hsl(210, 20%, 98%)",
        }}
      >
        {/* Heading */}
        <h1 className="text-xl font-bold mb-4 text-white-400">
          Hey, I'm{" "}
          <span className="text-4xl bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
            Daniel Ramirez
          </span>
        </h1>
        <p className="text-lg text-gray-400 mb-8">Get to know me better:</p>

        {/* Buttons */}
        <div className="flex flex-col gap-4">
          <a
            href="https://www.linkedin.com/in/danrmzz/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-xs px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md flex items-center justify-center gap-1 hover:bg-blue-500 transition hover:shadow-[0px_0px_10px_rgba(59,130,246,0.8)]"
          >
            <img
              src="https://img.icons8.com/?size=100&id=98960&format=png&color=FFFFFF"
              alt="LinkedIn Icon"
              className="w-7 h-7"
            />
            LinkedIn
          </a>

          <a
            href="https://github.com/danrmzz"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-xs px-6 py-3 bg-gray-700 text-white rounded-lg shadow-md flex items-center justify-center gap-1 hover:bg-gray-600 transition hover:shadow-[0px_0px_10px_rgba(55,65,81,0.8)]"
          >
            <img
              src="https://img.icons8.com/ios11/512/FFFFFF/github.png"
              alt="GitHub Icon"
              className="w-7 h-7"
            />
            GitHub
          </a>

          <a
            href="https://docs.google.com/document/d/1D1bsr9QKcMhOW2GWP6Z2oImUVFZ3pEv2iKTvjIx1Nro/edit?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-xs px-6 py-3 bg-red-700 text-white rounded-lg shadow-md flex items-center justify-center gap-1 hover:bg-red-600 transition hover:shadow-[0px_0px_10px_rgba(220,38,38,0.8)]"
          >
            <img
              src="https://img.icons8.com/?size=100&id=9108&format=png&color=FFFFFF"
              alt="Resume Icon"
              className="w-4 h-4"
            />
            Resume
          </a>

          <a
            href="https://www.danrmzz.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-xs px-6 py-3 bg-purple-700 text-white rounded-lg shadow-md flex items-center justify-center gap-1 hover:bg-purple-600 transition hover:shadow-[0px_0px_10px_rgba(128,90,213,0.8)]"
          >
            <img
              src="https://img.icons8.com/?size=100&id=FWxzrvIyJsUi&format=png&color=FFFFFF"
              alt="Laptop Icon"
              className="w-5 h-5"
            />
            Portfolio
          </a>
        </div>
      </div>
    </div>
  );
}
