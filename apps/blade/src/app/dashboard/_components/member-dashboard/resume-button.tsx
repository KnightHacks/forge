import Link from "next/link";

import { Button } from "@forge/ui/button";

import { api } from "~/trpc/server";

export async function ResumeButton() {
  const resume = await api.resume.getResume();

  if (!resume.url) {
    return (
      <Button className="w-full" disabled>
        Resume
      </Button>
    );
  }

  return (
    <Link href={resume.url} className="w-full">
      <Button className="w-full">Resume</Button>
    </Link>
  );
}
