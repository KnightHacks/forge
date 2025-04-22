import React from "react";

import ContactForm from "./_components/contact-form";
import Header from "./_components/header";
import LeftSide from "./_components/left-side";
import RightSide from "./_components/right-side";

export default function page() {
  return (
    <div
      id="contactPage"
      className="font-narrow bg-950 flex min-h-screen flex-row justify-center text-white"
    >
      {/* left background panel for the swords and etc  */}
      <div className="fixed left-0 z-0 h-screen w-1/2 border-blue-500 sm:max-w-64">
        <LeftSide />
      </div>

      {/* right background panel for the swords and etc  */}
      <div className="fixed right-0 z-0 h-screen w-1/2 border-purple-500 sm:max-w-64">
        <RightSide />
      </div>

      {/* Main content */}
      {/* Main content under 2xl */}
      <div className="z-10 mb-3 mt-[120px] h-5/6 w-[86%] sm:mt-[150px] md:w-5/6 lg:mt-[200px] 2xl:hidden">
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
