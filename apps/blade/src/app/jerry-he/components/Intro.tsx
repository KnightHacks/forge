import Link from "next/link";
import { FileUserIcon, LinkIcon } from "lucide-react";

import { ResumeIcon } from "@forge/ui";

import ImageFlipCard from "./shared/ImageFlipCard";

function Intro() {
  return (
    <div className="flex flex-col items-center justify-center pb-6 pt-20 text-center">
      <ImageFlipCard
        className="mb-3 size-48 rounded-full border-2 border-white object-cover md:mb-9"
        frontImage="jerry-assets/JerryPhoto.png"
        backImage="jerry-assets/headshotCrop.jpg"
        frontAlt="Cartoon Jerry"
        backAlt="Real Jerry"
      />

      <h1 className="mb-1 text-4xl font-bold dark:text-white md:mb-3 md:text-7xl">
        Jerry He
      </h1>
      <p className="mbb-3 text-base font-medium md:text-xl">
        Aspiring Software Engineer, CS Student
      </p>
      <p className="max-w-xl text-sm font-bold">
        &#128075; Welcome to my page :&#41;
      </p>
      <p className="mb-6 max-w-xl text-xs">
        ps try hovering over my picture &#129323;
      </p>

      <div className="container mx-auto max-w-screen-lg">
        <div>
          <div className="flex flex-wrap justify-center gap-2">
            <a
              href="https://linkedin.com/in/jerryhefl"
              target="_blank"
              className="inline-flex items-center space-x-2 rounded-full bg-sky-800 p-2 font-semibold text-white hover:bg-sky-700"
            >
              <svg
                className="h-8 w-10 fill-current"
                role="img"
                viewBox="0 0 256 256"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g>
                  <path d="M218.123122,218.127392 L180.191928,218.127392 L180.191928,158.724263 C180.191928,144.559023 179.939053,126.323993 160.463756,126.323993 C140.707926,126.323993 137.685284,141.757585 137.685284,157.692986 L137.685284,218.123441 L99.7540894,218.123441 L99.7540894,95.9665207 L136.168036,95.9665207 L136.168036,112.660562 L136.677736,112.660562 C144.102746,99.9650027 157.908637,92.3824528 172.605689,92.9280076 C211.050535,92.9280076 218.138927,118.216023 218.138927,151.114151 L218.123122,218.127392 Z M56.9550587,79.2685282 C44.7981969,79.2707099 34.9413443,69.4171797 34.9391618,57.260052 C34.93698,45.1029244 44.7902948,35.2458562 56.9471566,35.2436736 C69.1040185,35.2414916 78.9608713,45.0950217 78.963054,57.2521493 C78.9641017,63.090208 76.6459976,68.6895714 72.5186979,72.8184433 C68.3913982,76.9473153 62.7929898,79.26748 56.9550587,79.2685282 M75.9206558,218.127392 L37.94995,218.127392 L37.94995,95.9665207 L75.9206558,95.9665207 L75.9206558,218.127392 Z M237.033403,0.0182577091 L18.8895249,0.0182577091 C8.57959469,-0.0980923971 0.124827038,8.16056231 -0.001,18.4706066 L-0.001,237.524091 C0.120519052,247.839103 8.57460631,256.105934 18.8895249,255.9977 L237.033403,255.9977 C247.368728,256.125818 255.855922,247.859464 255.999,237.524091 L255.999,18.4548016 C255.851624,8.12438979 247.363742,-0.133792868 237.033403,0.000790807055" />
                </g>
              </svg>
            </a>
            <a
              href="https://github.com/jerhe3"
              target="_blank"
              className="inline-flex items-center space-x-2 rounded-full bg-purple-900 p-2 font-semibold text-white hover:bg-purple-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                aria-hidden="true"
                role="img"
                className="w-10"
                preserveAspectRatio="xMidYMid meet"
                viewBox="0 0 24 24"
              >
                <g fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385c.6.105.825-.255.825-.57c0-.285-.015-1.23-.015-2.235c-3.015.555-3.795-.735-4.035-1.41c-.135-.345-.72-1.41-1.23-1.695c-.42-.225-1.02-.78-.015-.795c.945-.015 1.62.87 1.845 1.23c1.08 1.815 2.805 1.305 3.495.99c.105-.78.42-1.305.765-1.605c-2.67-.3-5.46-1.335-5.46-5.925c0-1.305.465-2.385 1.23-3.225c-.12-.3-.54-1.53.12-3.18c0 0 1.005-.315 3.3 1.23c.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23c.66 1.65.24 2.88.12 3.18c.765.84 1.23 1.905 1.23 3.225c0 4.605-2.805 5.625-5.475 5.925c.435.375.81 1.095.81 2.22c0 1.605-.015 2.895-.015 3.3c0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
                    fill="currentColor"
                  />
                </g>
              </svg>
            </a>
            <Link
              href="/jerry-he/resume"
              target="_blank"
              className="flex size-14 items-center justify-center space-x-2 rounded-full bg-green-900 font-semibold text-white hover:bg-green-700"
            >
              <FileUserIcon className="size-10" />
            </Link>
            <a
              href="https://jerryhe.dev"
              target="_blank"
              className="flex size-14 items-center justify-center space-x-2 rounded-full bg-blue-500 p-2 font-semibold text-white hover:bg-blue-700"
            >
              <LinkIcon className="size-8" />
            </a>
          </div>
        </div>
      </div>
      <div className="mt-10 w-7/12">
        <p className="mb-1 text-sm dark:text-white md:mb-3 md:text-sm">
          This is an abridged version of my unfinished portfolio with some much
          needed updates (haven't updated since May 2024, oops!)
        </p>
        <p className="mb-1 text-sm dark:text-white md:mb-3 md:text-sm">
          A little about me: My name is Jerry He and I'm currently a rising
          Senior CS student at UCF! Throughout my time at UCF, I mainly worked
          on the frontend side of things using things like React and
          TailwindCSS. Though lately, I've been learning more backend
          development through some recent internships. Been spending way too
          much time writing corporate code and wanted a change of scenery for
          once :) You can find a little about my dev timeline below!
        </p>
      </div>
    </div>
  );
}

export default Intro;
