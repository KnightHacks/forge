export default function Nav() {
  return (
    <div className="sticky flex h-10 w-screen flex-row items-center justify-between border-b border-[#757575] bg-black px-4 text-white">
      <h1>knighthacks</h1>
      <div className="flex flex-row items-center justify-center space-x-2">
        <a
          href="https://webring.knighthacks.org"
          target="_blank"
          rel="noopener noreferrer"
          className=""
        >
          <span className="flicker-text hover:text-red-500">webring</span>
        </a>
        <a
          href="https://club.knighthacks.org"
          target="_blank"
          rel="noopener noreferrer"
          className=""
        >
          <span className="flicker-text hover:text-red-500">club</span>
        </a>
        <a
          href="https://blade.knighthacks.org"
          target="_blank"
          rel="noopener noreferrer"
          className=""
        >
          <span className="flicker-text hover:text-red-500">blade</span>
        </a>
        <a
          href="https://discord.knighthacks.org"
          target="_blank"
          rel="noopener noreferrer"
          className=""
        >
          <span className="flicker-text hover:text-red-500">discord</span>
        </a>
      </div>

      <a
        href="https://github.com/KnightHacks/forge"
        target="_blank"
        rel="noopener noreferrer"
        className=""
      >
        <span className="flicker-text hover:text-red-500">github</span>
      </a>
    </div>
  );
}
