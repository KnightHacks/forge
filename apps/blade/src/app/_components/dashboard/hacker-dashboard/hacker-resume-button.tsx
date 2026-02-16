import Link from "next/link";
import { Download, Upload } from "lucide-react";

import type { api as serverCall } from "~/trpc/server";

export function HackerResumeButton({
  resume,
}: {
  resume: Awaited<ReturnType<(typeof serverCall.resume)["getResume"]>>;
}) {
  if (!resume.url) {
    return (
      <Link className="w-full" href={"/settings/hacker-profile"}>
        <div className="relative flex h-14 w-full cursor-pointer items-center justify-center gap-x-2 border border-[#1F2937] transition-all duration-200 ease-in-out hover:bg-[#E5E7EB] dark:hover:bg-[#1F2937]">
          <Upload />
          <div className="text-lg font-bold">Upload Resume</div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={resume.url} className="w-full">
      <div className="relative flex h-14 w-full cursor-pointer items-center justify-center gap-x-2 border border-[#1F2937] transition-all duration-200 ease-in-out hover:bg-[#E5E7EB] dark:hover:bg-[#1F2937]">
        <Download />
        <div className="text-lg font-bold">Download Resume</div>
      </div>
    </Link>
  );
}
