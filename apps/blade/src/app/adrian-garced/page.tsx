
// import {
//   Github,
//   Code
// } from "lucide-react";
import {
  GithubIcon,
  CodebergIcon
} from "./icons"

export default async function AdrianG() {
  

  return (
    <main className="flex justify-center">
      <nav className="w-full border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <a href="#" className="font-semibold">
            adrian-g
          </a>

          <div className="flex items-center gap-4">
            <a href="..." className="flex items-center gap-2">
              <GithubIcon className="size-6" />
              {/* GitHub */}
            </a>

            <a href="..." className="flex items-center gap-2">
              <CodebergIcon />
              {/* Codeberg */}
            </a>
          </div>
        </div>
      </nav>
        <p></p>
    </main>
  );
}