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

      {/* Main content */}
      <div className="z-10 mb-3 mt-[120px] h-5/6 w-[86%] sm:mt-[150px] md:w-5/6 lg:mt-[200px]">
        <Header />
        <ContactForm />
      </div>

      {/* right background panel for the swords and etc  */}
      <div className="fixed right-0 z-0 h-screen w-1/2 border-purple-500 sm:max-w-64">
        <RightSide />
      </div>
    </div>
  );
}
