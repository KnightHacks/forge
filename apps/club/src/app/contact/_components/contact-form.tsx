"use client";

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
      className="mt-2 w-auto rounded-sm bg-white p-5 text-black"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div id="Name">
          <label className="mb-2 block font-bold tracking-wider">Name</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200"
            onChange={handleChange}
          />
        </div>

        <div id="Email">
          <label className="mb-2 block font-bold tracking-wider">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200"
            onChange={handleChange}
          />
        </div>

        <div id="Subject">
          <label className="mb-2 block font-bold tracking-wider">
            Message Subject
          </label>
          <input
            type="text"
            name="subject"
            required
            value={formData.subject}
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200"
            onChange={handleChange}
          />
        </div>

        <div id="Message">
          <label className="mb-2 block font-bold tracking-wider">
            Message Body
          </label>
          <textarea
            name="message"
            rows={6}
            required
            value={formData.message}
            className="bg-cream w-full rounded-sm border p-2 pl-3 font-sans text-xs saturate-200"
            onChange={handleChange}
          ></textarea>
        </div>

        <div id="contactOptions">
          <label className="font-bold tracking-wider">
            Which team would you like to contact?
          </label>

          <div id="checkBoxContainer" className="mt-2 grid grid-cols-2 gap-y-3">
            {/* Mentorship */}
            <label className="flex items-center space-x-2">
              <input
                name="mentorship"
                type="checkbox"
                className="custom-checkbox"
                checked={formData.mentorship}
                onChange={handleCheckboxChange}
              />
              <span className="text-xs tracking-wider">Mentorship</span>
            </label>

            {/* Outreach */}
            <label className="flex items-center space-x-2">
              <input
                name="outreach"
                type="checkbox"
                className="custom-checkbox"
                checked={formData.outreach}
                onChange={handleCheckboxChange}
              />
              <span className="text-xs tracking-wider">Outreach</span>
            </label>

            {/* Development */}
            <label className="flex items-center space-x-2">
              <input
                name="development"
                type="checkbox"
                className="custom-checkbox"
                checked={formData.development}
                onChange={handleCheckboxChange}
              />
              <span className="text-xs tracking-wider">Development</span>
            </label>

            {/* Design */}
            <label className="flex items-center space-x-2">
              <input
                name="design"
                type="checkbox"
                className="custom-checkbox"
                checked={formData.design}
                onChange={handleCheckboxChange}
              />
              <span className="text-xs tracking-wider">Design</span>
            </label>
          </div>
        </div>

        <div className="flex w-full justify-center">
          <button
            type="submit"
            className="mt-5 rounded-sm border-2 border-purple-800 bg-purple-400 px-3 text-white"
          >
            Contact Us
          </button>
        </div>
      </form>
    </div>
  );
}

export default ContactForm;
