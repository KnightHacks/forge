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
    // eslint-disable-next-line no-console
    console.log("The Form:", jsonFormData);
  };

  return (
    <div
      id="contactform"
      className="mt-2 w-auto rounded-md bg-white p-5 text-black md:flex md:justify-center md:bg-transparent md:px-0 lg:block lg:rounded-xl lg:bg-white lg:p-8 2xl:mt-[100vh]"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white pb-[15%] pr-0 sm:ml-5 md:ml-0 md:flex md:w-[80%] md:flex-col md:items-center md:rounded-lg md:p-5 md:pb-[13%] md:pt-8 lg:ml-4 lg:block lg:w-auto lg:space-y-6 2xl:ml-10 2xl:mt-10"
      >
        <div id="Name" className="md:w-5/6 lg:w-auto">
          <label className="mb-2 block font-bold tracking-wider lg:mb-5 lg:text-2xl 2xl:text-3xl">
            Name
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200 sm:w-9/12 md:w-full lg:mb-4 lg:h-14 lg:w-9/12 lg:p-2 lg:text-base 2xl:h-16 2xl:p-4 2xl:text-xl"
            onChange={handleChange}
          />
        </div>

        <div id="Email" className="md:w-5/6 lg:w-auto">
          <label className="mb-2 block font-bold tracking-wider lg:mb-5 lg:text-2xl 2xl:text-3xl">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200 sm:w-9/12 md:w-full lg:mb-4 lg:h-14 lg:w-9/12 lg:p-2 lg:text-base 2xl:h-16 2xl:p-4 2xl:text-xl"
            onChange={handleChange}
          />
        </div>

        <div id="Subject" className="md:w-5/6 lg:w-auto">
          <label className="mb-2 block font-bold tracking-wider lg:mb-5 lg:text-2xl 2xl:text-3xl">
            Message Subject
          </label>
          <input
            type="text"
            name="subject"
            required
            value={formData.subject}
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200 sm:w-9/12 md:w-full lg:mb-4 lg:h-14 lg:w-9/12 lg:p-2 lg:text-base 2xl:h-16 2xl:p-4 2xl:text-xl"
            onChange={handleChange}
          />
        </div>

        <div id="Message" className="md:w-5/6 lg:w-auto">
          <label className="mb-2 block font-bold tracking-wider lg:mb-5 lg:text-2xl 2xl:text-3xl">
            Message Body
          </label>
          <textarea
            name="message"
            rows={9}
            required
            value={formData.message}
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200 sm:w-9/12 md:w-full lg:mb-4 lg:w-9/12 lg:p-3 lg:text-base 2xl:p-4 2xl:text-xl"
            onChange={handleChange}
          ></textarea>
        </div>

        <div id="contactOptions" className="md:w-5/6 lg:w-auto">
          <label className="font-bold tracking-wider lg:text-2xl 2xl:text-3xl">
            Which team would you like to contact?
          </label>

          <div
            id="checkBoxContainer"
            className="mt-2 grid grid-cols-2 gap-y-3 sm:w-7/12 lg:mt-6 lg:gap-y-4 2xl:w-1/2"
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
                  <span className="text-xs capitalize tracking-wider lg:text-lg 2xl:text-xl">
                    {option}
                  </span>
                </label>
              ),
            )}
          </div>
        </div>

        <div className="flex w-full justify-center lg:ml-20 lg:justify-start">
          <button
            type="submit"
            className="font-prompt mt-5 rounded-lg border-2 border-purple-800 bg-purple-400 px-3 font-bold text-white shadow-[2px_2px_2px_1px_rgba(0,0,0,0.25)] lg:border-[3px] lg:px-5 lg:py-1 lg:text-xl lg:tracking-widest 2xl:ml-12"
          >
            Contact Us
          </button>
        </div>
      </form>
    </div>
  );
}

export default ContactForm;
