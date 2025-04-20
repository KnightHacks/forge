import React from "react";

import ContactForm from "./_components/contact-form";
import Header from "./_components/header";

export default function page() {
  return (
    <div
      id="contactPage"
      className="font-narrow flex h-screen flex-row items-center justify-center bg-orange-400 text-white"
    >
      <div
        id="leftSide"
        className="fixed left-0 z-0 h-screen w-1/6 min-w-64 bg-black"
      ></div>
      <div id="middleContainer" className="z-50">
        <Header />
        <ContactForm />
      </div>
      <div
        id="rightSide"
        className="fixed right-0 z-0 h-screen w-1/6 min-w-64 bg-black"
      ></div>
    </div>
  );
}
