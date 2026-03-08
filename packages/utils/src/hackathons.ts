import type { HackerClass } from "@forge/db/schemas/knight-hacks";

/**
 * Gets the team information for a hackathon class.
 *
 * @param {HackerClass} tag - The hacker class.
 * @returns {object} Team information including name, color, and image URL.
 *
 * @example
 * getClassTeam("Harbinger") // { team: "Monstrosity", teamColor: "#e03131", imgUrl: "/khviii/lenneth.jpg" }
 */
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
