export type SelectedProject = {
  title: string;
  description: string;
  content: string;
  technologies: string[];
  liveUrl?: string;
  repoUrl?: string;
};

export const SELECTED_PROJECTS: SelectedProject[] = [
  {
    title: "Image Upscaler",
    description: "Image processing API",
    content:
      "A FastAPI backend using OpenCV for image upscaling and processing. Built to explore Python APIs, and the practical side of deploying service. Although, there is no live link due to bandwidth and high hardware costs of running an image processing API",
    technologies: ["Python", "FastAPI", "OpenCV", "UV"],
    repoUrl: ""
  },
  {
    title: "Pastebox",
    description: "Simple paste sharing service",
    content:
      "A lightweight pastebin alternative. Users can submit text and receive a unique URL. Built as an to start learning about databases, persistence, and deploying a small web service. I plan on adding auth, syntax highlighting, and different viewing times",
    technologies: ["TypeScript", "Hono", "SQLite", "Tailwind"],
    liveUrl: "https://pastebox.koyeb.app/",
    repoUrl: "https://github.com/pinkytoefoo/pastebox"
  },
  {
    title: "Frobby Blog",
    description: "A culmination of what I learn",
    content:
      "A place to document what I'm learning about programming, computers, and the projects I build. The goal is to turn things I learn into something I can revisit, and hopefully share with other people too!",
    technologies: ["Astro", "TypeScript", "Tailwind CSS", "Vercel"],
    liveUrl: "https://frobby-blog.vercel.app/",
    repoUrl: "https://github.com/pinkytoefoo/frobby-blog"
  },
  {
    title: "Word Counter",
    description: "Text analysis tool",
    content:
      "A small web tool for analyzing text, including word, sentence, and character counts. One of my earlier projects focused on building and shipping a useful tool without adding uneeded complexity.",
    technologies: ["TypeScript", "Solid.js", "Web"],
    liveUrl: "https://wordcounty.vercel.app/",
    repoUrl: "https://github.com/pinkytoefoo/word-counter"
  },
];