import {
  DiscordLogoIcon,
  GitHubLogoIcon,
  GlobeIcon,
} from "@radix-ui/react-icons";

export default function HenryDevApplicationPage() {
  return (
    <main className="mx-auto mb-24 flex h-screen w-full flex-col items-center justify-around gap-8 p-8 xl:flex-row">
      <div id="intro" className="h-xl flex flex-col gap-2">
        <h1 className="text-center text-7xl 2xl:text-left">
          hi. i'm henry <b className="text-gray-600">██████</b>
        </h1>
        <h2 className="text-center text-4xl 2xl:text-left">
          but i also go by{" "}
          <span className="text-6xl text-yellow-400">nova</span>.
        </h2>
        <sub className="text-center text-xl text-gray-400 2xl:text-left">
          (no full name, i got opps)
        </sub>
        <div
          id="socials"
          className="flex flex-row items-stretch justify-around py-4"
        >
          <a href="javascript:alert('@suprnova')">
            <DiscordLogoIcon width="50px" height="50px" />
          </a>
          <a href="https://github.com/Suprnova" target="_blank">
            <GitHubLogoIcon width="50px" height="50px" />
          </a>
          <a href="https://suprnova.dev" target="_blank">
            <GlobeIcon width="50px" height="50px" />
          </a>
        </div>
        <p className="text-center text-xl">
          please get in touch with{" "}
          <strong className="text-purple-600 dark:text-purple-300">
            @suprnova
          </strong>{" "}
          on discord or{" "}
          <a className="text-purple-400" href="mailto:nova@suprnova.dev">
            nova@suprnova.dev
          </a>{" "}
          for a resume link
        </p>
        <sub className="text-center text-sm">(privacy reasons)</sub>
      </div>

      <div
        id="aside"
        className="flex flex-col items-center justify-center gap-4 xl:justify-normal"
      >
        <img
          className="max-w-[400px]"
          alt="illustration of henry"
          src="../nova_portrait.jpg"
        />
        <strong className="text-center">
          i don't have a good portrait, so here's old art of myself instead
          (liberties taken)
        </strong>
      </div>
    </main>
  );
}
