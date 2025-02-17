import Link from "next/link";

import { Button } from "@forge/ui/button";

export default function NotFoundPage() {
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-4xl font-bold">
        <span className="text-primary">404</span> &mdash; Page Not Found
      </h1>
      <p>
        It seems like you've ventured off course. Click below to return to{" "}
        <b>Blade</b>!
      </p>
      <Link href="/">
        <Button>Go To Blade</Button>
      </Link>
    </main>
  );
}
