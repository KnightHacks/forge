"use client";

// TABLET PUT EVERYTHING IN ITEMS CENTER AND JUSTIFY CENTER
import React, { useState } from "react";

function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    mentorship: false,
    outreach: false,
    development: false,
    design: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const jsonFormData = JSON.stringify(formData);
    console.log("The Form:", jsonFormData);
  };

  return (
    <div
      id="contactform"
      className="mt-2 w-auto rounded-md bg-white p-5 text-black md:px-0 lg:rounded-xl lg:p-8"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4 sm:ml-5 lg:ml-4 lg:space-y-6"
      >
        <div id="Name">
          <label className="block font-bold tracking-wider lg:mb-5 lg:text-2xl">
            Name
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200 sm:w-9/12 lg:mb-4 lg:h-14 lg:p-2 lg:text-base"
            onChange={handleChange}
          />
        </div>

        <div id="Email">
          <label className="mb-2 block font-bold tracking-wider lg:mb-5 lg:text-2xl">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200 sm:w-9/12 lg:mb-4 lg:h-14 lg:p-2 lg:text-base"
            onChange={handleChange}
          />
        </div>

        <div id="Subject">
          <label className="mb-2 block font-bold tracking-wider lg:mb-5 lg:text-2xl">
            Message Subject
          </label>
          <input
            type="text"
            name="subject"
            required
            value={formData.subject}
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200 sm:w-9/12 lg:mb-4 lg:h-14 lg:p-2 lg:text-base"
            onChange={handleChange}
          />
        </div>

        <div id="Message">
          <label className="mb-2 block font-bold tracking-wider lg:mb-5 lg:text-2xl">
            Message Body
          </label>
          <textarea
            name="message"
            rows={9}
            required
            value={formData.message}
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200 sm:w-9/12 lg:mb-4 lg:p-3 lg:text-sm"
            onChange={handleChange}
          ></textarea>
        </div>

        <div id="contactOptions">
          <label className="font-bold tracking-wider lg:text-2xl">
            Which team would you like to contact?
          </label>

          <div
            id="checkBoxContainer"
            className="mt-2 grid grid-cols-2 gap-y-3 sm:w-7/12 lg:mt-6 lg:gap-y-4"
          >
            {["mentorship", "outreach", "development", "design"].map(
              (option) => (
                <label
                  key={option}
                  className="flex items-center space-x-2 lg:space-x-3"
                >
                  <input
                    name={option}
                    type="checkbox"
                    className="custom-checkbox lg:checkbox-lg h-4 w-4 lg:h-6 lg:w-6"
                    checked={
                      formData[option as keyof typeof formData] as boolean
                    }
                    onChange={handleCheckboxChange}
                  />
                  <span className="text-xs capitalize tracking-wider lg:text-lg">
                    {option}
                  </span>
                </label>
              ),
            )}
          </div>
        </div>

        <div className="flex w-full justify-center">
          <button
            type="submit"
            className="font-prompt mt-5 rounded-sm border-2 border-purple-800 bg-purple-400 px-3 font-bold text-white lg:px-5 lg:py-1 lg:text-xl lg:tracking-wider"
          >
            Contact Us
          </button>
        </div>
      </form>
    </div>
  );
}

export default ContactForm;
