import type { EVENTS } from "@forge/consts";

/**
 * Gets the Tailwind CSS color classes for an event tag.
 *
 * @param {EVENTS.EventTagsColor} tag - The event tag.
 * @returns {string} Tailwind CSS classes for the tag color.
 *
 * @example
 * getTagColor("GBM") // "bg-blue-100 text-blue-800"
 */
export const getTagColor = (tag: EVENTS.EventTagsColor) => {
  const colors: Record<EVENTS.EventTagsColor, string> = {
    GBM: "bg-blue-100 text-blue-800",
    Social: "bg-pink-100 text-pink-800",
    Kickstart: "bg-green-100 text-green-800",
    "Project Launch": "bg-purple-100 text-purple-800",
    "Hello World": "bg-yellow-100 text-yellow-800",
    Sponsorship: "bg-orange-100 text-orange-800",
    "Tech Exploration": "bg-cyan-100 text-cyan-800",
    "Class Support": "bg-indigo-100 text-indigo-800",
    Workshop: "bg-teal-100 text-teal-800",
    OPS: "bg-purple-100 text-purple-800",
    Hackathon: "bg-violet-100 text-violet-800",
    Collabs: "bg-red-100 text-red-800",
    "Check-in": "bg-gray-100 text-gray-800",
    Ceremony: "bg-amber-100 text-amber-800",
    Merch: "bg-lime-100 text-lime-800",
    Food: "bg-rose-100 text-rose-800",
    "CAREER-FAIR": "bg-lime-100 text-lime-800", // change later
    "RSO-FAIR": "bg-lime-100 text-lime-800", // change later
  };
  return colors[tag];
};
