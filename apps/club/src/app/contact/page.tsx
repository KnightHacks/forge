import React from "react";

import ContactForm from "~/app/_components/contact/contact-form";
import Header from "~/app/_components/contact/header";
import LeftSide from "~/app/_components/contact/left-side";
import RightSide from "~/app/_components/contact/right-side";

export default function page() {
  return (
    <div
      id="contactPage"
      className="font-narrow bg-950 flex min-h-screen flex-row justify-center text-white"
    >
      {/* left background panel for the swords and etc  */}
      <LeftSide />

      {/* right background panel for the swords and etc  */}
      <RightSide />

      {/* Main content */}
      {/* Main content under 2xl */}
      <div className="z-10 mb-3 mt-[120px] h-5/6 w-[86%] sm:mt-[150px] md:w-[80%] lg:mt-[200px] 2xl:hidden">
        <Header />
        <ContactForm />
      </div>

      {/* Main content over 2xl */}
      <div className="hidden min-h-screen w-screen flex-col items-center 2xl:flex">
        <div className="z-0 hidden w-full 2xl:block">
          <Header />
        </div>
        <div className="z-10 mb-6 hidden h-5/6 w-[78%] 2xl:block">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
