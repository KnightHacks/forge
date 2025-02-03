import type { Metadata } from "next";
import Link from "next/link";

import { SPONSOR_VIDEO_LINK } from "@forge/consts/knight-hacks";
import { Button } from "@forge/ui/button";

export const metadata: Metadata = {
  title: "Sponsor Knight Hacks!",
  description: "Help us make dreams!",
}; // doesn't follow the metadata convention to prevent confusion from sponsors

export default function Sponsor() {
  return (
    <main className="mx-auto mb-40 flex w-full flex-col justify-center pl-8 pr-8 md:w-[800px]">
      <h1 className="mb-2 pt-10 text-center text-3xl font-bold tracking-tighter sm:mb-10 sm:pt-20 sm:text-5xl">
        Want to sponsor{" "}
        <span className="text-[hsl(var(--primary-lighter))]">
          Knight Hacks?
        </span>
      </h1>
      <p className="p-2 text-center text-sm tracking-tighter sm:text-base">
        Every year,{" "}
        <b className="text-[hsl(var(--primary-lighter))]">Knight Hacks</b> hosts
        a 36-hour event at the University of Central Florida, where students
        come together to create and learn, by developing a project over the
        course of a weekend. We aim to create a
        <b className="text-[hsl(var(--primary-lighter))]">
          {" "}
          diverse, welcoming, and inclusive community
        </b>{" "}
        for anyone interested in technology.
      </p>
      <p className="p-2 text-center text-sm tracking-tighter sm:text-base">
        Companies who sponsor us are able to mentor, teach, and recruit{" "}
        <b className="text-[hsl(var(--primary-lighter))]">around 600+</b>{" "}
        brilliant students with a passion for building, and gain brand
        recognition. See below to learn more about us!
      </p>
      <div className="mx-auto mt-2 flex flex-col justify-center">
        <p className="p-2 text-center text-sm tracking-tighter sm:text-base">
          <i>
            View how{" "}
            <b className="text-[hsl(var(--primary-lighter))]">Knight Hacks</b>{" "}
            impacts those who attend:
          </i>
        </p>
        <iframe
          width="560"
          height="315"
          src={SPONSOR_VIDEO_LINK}
          className="h-[200px] w-full sm:h-[315px] sm:w-[560px]"
        ></iframe>
      </div>
      <div className="mx-auto mt-5 flex flex-col justify-center">
        <p className="p-2 text-center text-sm tracking-tighter sm:text-base">
          <i>
            Want to make dreams? View how you can help make{" "}
            <b className="text-[hsl(var(--primary-lighter))]">Knight Hacks</b>{" "}
            possible:
          </i>
        </p>
        <div className="mx-auto flex flex-col justify-center">
          <Link href={"/prospectus.pdf"}>
            <Button>
              <h1 className="text-2xl font-bold">Sponsorship Package</h1>
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
