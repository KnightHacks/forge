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
    <div id="contactform" className="mt-2 w-auto bg-white p-5 text-black">
      <form action="" className="space-y-4">
        <div id="Name">
          <label className="mb-2 block font-bold">Name</label>
          <input type="text" name="name" className="w-full border" />
        </div>
        <div id="Email">
          <label className="mb-2 block font-bold">Email</label>
          <input type="text" name="name" className="w-full border" />
        </div>
        <div id="Subject">
          <label className="mb-2 block font-bold">Message Subject</label>
          <input type="text" name="name" className="w-full border" />
        </div>
        <div id="Message">
          <label className="mb-2 block font-bold">Message Body</label>
          <textarea
            name="message"
            id=""
            rows={3}
            className="w-full border"
          ></textarea>
        </div>
        <div id="contactOption">
          <label className="font-bold">
            Which team would you like to contact?
          </label>
          <div className="grid grid-cols-2">
            <label className="flex items-center space-x-2">
              <input type="checkbox" />
              <span>Mentorship</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" />
              <span>Outreach</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" />
              <span>Development</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" />
              <span>Design</span>
            </label>
          </div>
        </div>

        <button className="ml-6">Contact Us</button>
      </form>
    </div>
  );
}

export default ContactForm;
