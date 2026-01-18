export default function Application() {
  return (
    <>
      <div className="curtain1 pointer-events-none fixed z-30 h-[100dvh] w-[100dvw] bg-black"></div>

      <div>
        <div className="curtain3 pointer-events-none fixed flex h-[100dvh] w-[100dvw] flex-col items-center justify-center">
          <p className="khfont mb-20 text-4xl md:text-6xl">
            Dev Application for...
          </p>
          <img src="/banner.png" alt="khbanner" className="h-[80%] w-[80%]" />
        </div>
      </div>

      <div className="curtain2">
        <div className="tkfactory tkfactorymove pointer-events-none fixed bottom-0 z-10 h-[50dvh] w-[100vw]" />
        <div className="piping pipingmove pointer-events-none fixed z-0 h-[100dvh] w-[100dvw]" />
        <img
          src="/gear.png"
          alt="gear"
          className="gearmoveright fixed right-6 top-6 z-10 h-64 md:h-80"
        />
        <img
          src="/gear.png"
          alt="gear"
          className="gearmoverightbottom fixed right-6 top-28 z-10 h-48 md:top-32 md:h-64"
        />
        <img
          src="/gear.png"
          alt="gear"
          className="gearmoveleft fixed left-6 top-6 z-10 h-64 md:h-80"
        />

        <img
          src="/gear.png"
          alt="gear"
          className="gearmoveleftbottom fixed left-6 top-28 z-10 h-48 md:top-32 md:h-64"
        />

        <div className="flex h-[10dvh] w-[100dvw] flex-col items-center justify-center md:h-[20dvh]">
          <p className="title-animate khfont z-20 rounded-full bg-gray-400 bg-opacity-80 p-3 text-2xl text-blue-800 md:text-5xl">
            Anthony Calabrese
          </p>
        </div>
        <div className="box-pulse z-10 flex h-[60dvh] w-[100dvw] flex-col items-center justify-center md:h-[40dvh]">
          <a
            href="/resume.pdf"
            target="_blank"
            className="khfont mb-10 scale-100 transform rounded-full bg-gray-400 bg-opacity-80 p-3 text-xl text-blue-600 transition duration-150 hover:scale-[1.2] hover:text-yellow-500 md:text-2xl"
          >
            Resume
          </a>

          <a
            href="https://www.linkedin.com/in/anthony-calabrese-b4453930b/"
            target="_blank"
            className="khfont mb-10 scale-100 transform rounded-full bg-gray-400 bg-opacity-80 p-3 text-xl text-blue-600 transition duration-150 hover:scale-[1.2] hover:text-yellow-500 md:text-2xl"
          >
            Linkedin
          </a>
          <a
            href="https://www.linkedin.com/in/anthony-calabrese-b4453930b/"
            target="_blank"
            className="khfont mb-10 scale-100 transform rounded-full bg-gray-400 bg-opacity-80 p-3 text-xl text-blue-600 transition duration-150 hover:scale-[1.2] hover:text-yellow-500 md:text-2xl"
          >
            Github
          </a>
          <a
            href="https://anthonycalabrese.dev/"
            target="_blank"
            className="khfont mb-10 scale-100 transform rounded-full bg-gray-400 bg-opacity-80 p-3 text-xl text-blue-600 transition duration-150 hover:scale-[1.2] hover:text-yellow-500 md:text-2xl"
          >
            Portfolio
          </a>
        </div>
      </div>
    </>
  );
}

/* unused stuff

<p className="mb-10 scale-100 transform text-xl transition duration-150 hover:scale-[1.2] hover:text-yellow-500">
            application
          </p>

          */
