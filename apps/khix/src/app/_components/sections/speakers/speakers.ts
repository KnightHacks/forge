export interface SpeakerShowcaseSpeaker {
  name: string;
  imageSrc: string;
  companyRole: string;
  linkedinUrl?: string;
}

const SPEAKER_PLACEHOLDER_IMAGE = "/assets/speaker-holder.webp";

export const KHIX_SPEAKERS = [
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
    companyRole: "??? @ ???",
  },
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
    companyRole: "??? @ ???",
  },
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
    companyRole: "??? @ ???",
  },
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
    companyRole: "??? @ ???",
  },
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
    companyRole: "??? @ ???",
  },
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
    companyRole: "??? @ ???",
  },
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
    companyRole: "??? @ ???",
  },
  {
    name: "Coming soon",
    imageSrc: SPEAKER_PLACEHOLDER_IMAGE,
    companyRole: "??? @ ???",
  },
] satisfies readonly SpeakerShowcaseSpeaker[];
