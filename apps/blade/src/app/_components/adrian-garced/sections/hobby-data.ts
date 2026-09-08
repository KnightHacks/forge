export enum VisualType {
  None,
  Image,
  Video
}

export type BaseProject = {
  title: string;
  description: string;
  content: string;
  repoUrl: string;
  tags: string[];
};

export type VideoProject = BaseProject & {
  visualType: VisualType.Video;
  videoUrl: string;
};

export type ImageProject = BaseProject & {
  visualType: VisualType.Image;
  visualUrl: string;
};

export type NoVisualProject = BaseProject & {
  visualType: VisualType.None;
};

type Project = VideoProject | ImageProject | NoVisualProject;

export const PROJECTS: Project[] = [
  {
    title: "tort",
    description: "Cross-Platform shell",
    content: "A super basic shell with basic features, like child process creation, builtins, and prompt customization (very hacky). I wrote majority of the project within a weekend as a challenge to myself, however, I do plan on working on this project further and making it more practical, and add more complex features like piping, redirecting, and autocompletion (similar to the fish shell).",
    visualType: VisualType.Video,
    videoUrl: "https://github.com/user-attachments/assets/ed16a1e4-ab37-4188-89d6-c33ce164c86c",
    repoUrl: "https://github.com/pinkytoefoo/tort",
    tags: ["C", "Unix", "Windows", "System Calls", "Written within a weekend"]
  },
  {
    title: "Minecraft Clone",
    description: "Minecraft C++ edition",
    content: "Written C++ and OpenGL. I hope to experiment with other rendering APIs (primarily Vulkan and DX12) in the future. I plan on doing chunking and terrain generation next.",
    visualType: VisualType.Video,
    videoUrl: "https://github.com/user-attachments/assets/565d9330-d81a-404d-9639-d2b12d7ff514",
    repoUrl: "https://github.com/pinkytoefoo/minecraft-plusplus",
    tags: ["C++", "OpenGL", "GLFW", "GLM", "Dear ImGui"]
  },
  {
    title: "Cuebox",
    description: "Desktop soundboard application",
    content: "A desktop soundboard exploring Rust, Tauri, audio playback, and virtual audio devices. I currently am working on adding sounds, removing sounds, and adjusting the audio levels.",
    visualType: VisualType.None,
    repoUrl: "https://codeberg.org/pinkytoefoo/cuebox",
    tags: ["Rust", "Tauri", "Audio Playback", "Desktop Apps"]
  },
];
