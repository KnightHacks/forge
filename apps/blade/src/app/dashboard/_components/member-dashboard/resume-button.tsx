import Link from "next/link";
import { Download } from "lucide-react";

import { Button } from "@forge/ui/button";

import { api } from "~/trpc/server";

export async function ResumeButton() {
  const resume = await api.resume.getResume();

  if (resume.url == null) {
    return (
      <Button size="sm" className="w-full gap-1" disabled>
        <Download className="h-4 w-4" /> <span>Download Resume</span>
      </Button>
    );
  }

  return (
    <Link href={resume.url} className="w-full">
      <Button size="sm" className="w-full gap-1">
        <Download className="h-4 w-4" /> <span>Download Resume</span>
      </Button>
    </Link>
  );
}
