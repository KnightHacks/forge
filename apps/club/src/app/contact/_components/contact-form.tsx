"use client";

import React, { useState } from "react";

function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  return (
    <div
      id="contactform"
      className="text-bold w-auto bg-white font-bold text-black"
    >
      <form action="" className="space-y-4">
        <div id="Name">Name</div>
        <div id="Email">Email</div>
        <div id="Subject">Subject</div>
        <div id="Message">Message</div>
        <div id="contactOption">Options</div>
        <button>Contact Us</button>
      </form>
    </div>
  );
}

export default ContactForm;
