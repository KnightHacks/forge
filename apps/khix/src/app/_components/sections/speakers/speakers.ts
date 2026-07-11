export interface SpeakerShowcaseSpeaker {
  name: string;
  imageSrc: string;
  companyRole?: string;
  linkedinUrl?: string;
}

const SPEAKER_PLACEHOLDER_IMAGE = "/assets/speaker-holder.webp";

export const KHIX_SPEAKERS = [
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
  },
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
  },
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
  },
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
  },
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
  },
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
  },
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
  },
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
  },
] satisfies readonly SpeakerShowcaseSpeaker[];
