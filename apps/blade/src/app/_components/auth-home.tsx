"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function AuthHome() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading" || (status === "authenticated" && session)) {
    return (
      <div className="mt-28 flex h-full w-full flex-col items-center px-2 sm:mt-0 sm:justify-center">
        <h1 className="w-full break-words text-center text-3xl font-extrabold leading-tight tracking-tight sm:text-[3rem]">
          Redirecting to your dashboard...
        </h1>
      </div>
    );
  }

  return null;
}
