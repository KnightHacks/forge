"use client";

// import React, { useState } from "react";

function ContactForm() {
  // const [formData, setFormData] = useState({
  //   name: "",
  //   email: "",
  //   subject: "",
  //   message: "",
  // });
  return (
    <div
      id="contactform"
      className="text-bold mt-2 w-auto bg-white p-5 font-bold text-black"
    >
      <form action="" className="space-y-4">
        <div id="Name">
          <label className="mb-2 block">Name</label>
          <input type="text" name="name" className="border" />
        </div>
        <div id="Email">
          <label className="mb-2 block">Email</label>
          <input type="text" name="name" className="border" />
        </div>
        <div id="Subject">
          <label className="mb-2 block">Message Subject</label>
          <input type="text" name="name" className="border" />
        </div>
        <div id="Message">
          <label className="mb-2 block">Message Body</label>
          <input type="text" name="name" className="border" />
        </div>
        <div id="contactOption">Which team would you like to contact?</div>

        <button>Contact Us</button>
      </form>
    </div>
  );
}

export default ContactForm;
