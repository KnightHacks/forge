import React from "react";

import ContactForm from "./_components/contact-form";
import Header from "./_components/header";

export default function page() {
  return (
    <div
      id="contactPage"
      className="flex h-screen flex-col items-center justify-center bg-orange-400 text-white"
    >
      <div id="mainContentContainer">
        <Header />
        <ContactForm />
      </div>
    </div>
  );
}
