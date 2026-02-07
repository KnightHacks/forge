export const LIST = [
  {
    name: "Dylan Vidal",
    position: "President",
    image: "/officers/dylan.png",
    linkedin: "https://www.linkedin.com/in/dylanvidal1204/",
    major: "Computer Science",
  },
  {
    name: "Leonard Gofman",
    position: "Vice President",
    image: "/officers/leo.png",
    linkedin: "https://www.linkedin.com/in/leonard-gofman-208578236/",
    major: "Computer Science",
  },
  {
    name: "Adrian Osorio",
    position: "Treasurer",
    image: "/officers/adrian.png",
    linkedin: "https://www.linkedin.com/in/adrianosoriob/",
    major: "Computer Engineering",
  },
  {
    name: "Lewin Bobda",
    position: "Dev Lead",
    image: "/officers/bobda.png",
    linkedin: "https://www.linkedin.com/in/lewin-bobda-08ba2325a/",
    major: "Computer Science",
  },
  {
    name: "Daniel Efres",
    position: "Secretary",
    image: "/officers/daniel.png",
    linkedin: "https://www.linkedin.com/in/daniel-efres/",
    major: "Computer Science",
  },
  {
    name: "Richard Phillips",
    position: "Hack Lead",
    image: "/officers/ricky.png",
    linkedin: "https://www.linkedin.com/in/rphillipscs/",
    major: "Computer Science",
  },
] as const;

export type Officer = (typeof LIST)[number];
