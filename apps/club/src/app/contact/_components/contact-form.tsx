"use client";

import React, { useState } from "react";

function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    contactOption: {
      mentorship: false,
      outreach: false,
      development: false,
      design: false,
    },
  });
  return (
    <div
      id="contactform"
      className="mt-2 w-auto rounded-sm bg-white p-5 text-black"
    >
      <form action="" className="space-y-4">
        <div id="Name">
          <label className="mb-2 block font-bold tracking-wider">Name</label>
          <input
            type="text"
            name="name"
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200"
          />
        </div>
        <div id="Email">
          <label className="mb-2 block font-bold tracking-wider">
            Email Address
          </label>
          <input
            type="text"
            name="name"
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200"
          />
        </div>
        <div id="Subject">
          <label className="mb-2 block font-bold tracking-wider">
            Message Subject
          </label>
          <input
            type="text"
            name="name"
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200"
          />
        </div>
        <div id="Message">
          <label className="mb-2 block font-bold tracking-wider">
            Message Body
          </label>
          <textarea
            name="message"
            id=""
            rows={6}
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200"
          ></textarea>
        </div>
        <div id="contactOption">
          <label className="font-bold tracking-wider">
            Which team would you like to contact?
          </label>
          <div className="mt-2 grid grid-cols-2 gap-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded-md border-gray-300 bg-black accent-blue-600 saturate-200"
              />
              <span className="text-xs">Mentorship</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded-md border-gray-300 bg-black accent-blue-600 saturate-200"
              />
              <span className="text-xs">Outreach</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded-md border-gray-300 bg-black accent-blue-600 saturate-200"
              />
              <span className="text-xs">Development</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded-md border-gray-300 bg-black accent-blue-600 saturate-200"
              />
              <span className="text-xs">Design</span>
            </label>
          </div>
        </div>

        <div className="flex w-full justify-center">
          <button className="mt-5 rounded-sm border-2 border-purple-800 bg-purple-400 px-3 text-white">
            Contact Us
          </button>
        </div>
      </form>
    </div>
  );
}

export default ContactForm;
