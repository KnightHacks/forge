import type { EventTagsColor } from "@forge/consts/knight-hacks";
import type { HackerClass } from "@forge/db/schemas/knight-hacks";

export const formatDateTime = (date: Date) => {
  // Create a new Date object 5 hours behind the original
  const adjustedDate = new Date(date.getTime());
  adjustedDate.setDate(adjustedDate.getDate() + 1);

  return adjustedDate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const getFormattedDate = (start_datetime: string | Date) => {
  const date = new Date(start_datetime);
  date.setDate(date.getDate() + 1);
  return date.toLocaleDateString();
};

export const formatDateRange = (startDate: Date, endDate: Date) => {
  const start = new Date(startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const end = new Date(endDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${start} - ${end}`;
};

export const getTagColor = (tag: EventTagsColor) => {
  const colors: Record<EventTagsColor, string> = {
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

export const getClassTeam = (tag: HackerClass) => {
  if (["Harbinger", "Alchemist", "Monstologist"].includes(tag)) {
    return {
      team: "Monstrosity",
      teamColor: "#e03131",
      imgUrl: "/khviii/lenneth.jpg",
    };
  }
  return {
    team: "Humanity",
    teamColor: "#228be6",
    imgUrl: "/khviii/tkhero.jpg",
  };
};
