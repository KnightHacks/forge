import React from "react";

import ContactForm from "./_components/contact-form";
import Header from "./_components/header";
import LeftSide from "./_components/left-side";
import RightSide from "./_components/right-side";

export default function page() {
  return (
    <div
      id="contactPage"
      className="font-narrow bg-950 flex h-screen flex-row items-center justify-center text-white"
    >
      {/* left background panel for the swords and etc  */}
      <div className="fixed left-0 z-0 h-screen w-1/6 min-w-64 bg-black">
        <LeftSide />
      </div>

      {/* Main content */}
      <div className="z-50">
        <Header />
        <ContactForm />
      </div>

      {/* right background panel for the swords and etc  */}
      <div className="fixed right-0 z-0 h-screen w-1/6 min-w-64 bg-black">
        <RightSide />
      </div>
    </div>
  );
}
