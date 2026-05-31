import type { CSSProperties } from "react";

type BirdStyle = CSSProperties & Record<`--${string}`, string>;

interface Bird {
  className: string;
  style: BirdStyle;
}

const SKY_BIRDS: Bird[] = [
  {
    className: "bloom-bird bloom-bird-soft",
    style: {
      "--bird-top": "18%",
      "--bird-scale": "0.74",
      "--bird-duration": "38s",
      "--bird-delay": "-18s",
      "--bird-start-y": "-12px",
      "--bird-mid-y": "12px",
      "--bird-end-y": "-8px",
    },
  },
  {
    className: "bloom-bird",
    style: {
      "--bird-top": "32%",
      "--bird-scale": "0.92",
      "--bird-duration": "44s",
      "--bird-delay": "-7s",
      "--bird-start-y": "10px",
      "--bird-mid-y": "-18px",
      "--bird-end-y": "4px",
    },
  },
  {
    className: "bloom-bird bloom-bird-small",
    style: {
      "--bird-top": "52%",
      "--bird-scale": "0.62",
      "--bird-duration": "41s",
      "--bird-delay": "-29s",
      "--bird-start-y": "-2px",
      "--bird-mid-y": "6px",
      "--bird-end-y": "-10px",
    },
  },
  {
    className: "bloom-bird bloom-bird-soft",
    style: {
      "--bird-top": "42%",
      "--bird-scale": "0.58",
      "--bird-duration": "47s",
      "--bird-delay": "-35s",
      "--bird-start-y": "8px",
      "--bird-mid-y": "-10px",
      "--bird-end-y": "2px",
    },
  },
  {
    className: "bloom-bird",
    style: {
      "--bird-top": "12%",
      "--bird-scale": "0.68",
      "--bird-duration": "52s",
      "--bird-delay": "-24s",
      "--bird-start-y": "-4px",
      "--bird-mid-y": "10px",
      "--bird-end-y": "-12px",
    },
  },
];

const ABOUT_BIRDS: Bird[] = [
  {
    className: "bloom-bird bloom-bird-section bloom-bird-soft",
    style: {
      "--bird-top": "10%",
      "--bird-scale": "0.66",
      "--bird-duration": "46s",
      "--bird-delay": "-11s",
      "--bird-start-y": "8px",
      "--bird-mid-y": "-12px",
      "--bird-end-y": "6px",
    },
  },
  {
    className: "bloom-bird bloom-bird-section",
    style: {
      "--bird-top": "36%",
      "--bird-scale": "0.86",
      "--bird-duration": "54s",
      "--bird-delay": "-31s",
      "--bird-start-y": "-10px",
      "--bird-mid-y": "14px",
      "--bird-end-y": "-4px",
    },
  },
  {
    className: "bloom-bird bloom-bird-section bloom-bird-small",
    style: {
      "--bird-top": "64%",
      "--bird-scale": "0.56",
      "--bird-duration": "49s",
      "--bird-delay": "-22s",
      "--bird-start-y": "4px",
      "--bird-mid-y": "-8px",
      "--bird-end-y": "12px",
    },
  },
  {
    className: "bloom-bird bloom-bird-section bloom-bird-soft",
    style: {
      "--bird-top": "78%",
      "--bird-scale": "0.48",
      "--bird-duration": "58s",
      "--bird-delay": "-42s",
      "--bird-start-y": "-2px",
      "--bird-mid-y": "9px",
      "--bird-end-y": "-9px",
    },
  },
];

const FAQ_BIRDS: Bird[] = [
  {
    className: "bloom-bird bloom-bird-section bloom-bird-small",
    style: {
      "--bird-top": "14%",
      "--bird-scale": "0.58",
      "--bird-duration": "48s",
      "--bird-delay": "-28s",
      "--bird-start-y": "-8px",
      "--bird-mid-y": "10px",
      "--bird-end-y": "-5px",
    },
  },
  {
    className: "bloom-bird bloom-bird-section",
    style: {
      "--bird-top": "42%",
      "--bird-scale": "0.78",
      "--bird-duration": "56s",
      "--bird-delay": "-16s",
      "--bird-start-y": "12px",
      "--bird-mid-y": "-14px",
      "--bird-end-y": "8px",
    },
  },
  {
    className: "bloom-bird bloom-bird-section bloom-bird-soft",
    style: {
      "--bird-top": "68%",
      "--bird-scale": "0.52",
      "--bird-duration": "51s",
      "--bird-delay": "-39s",
      "--bird-start-y": "2px",
      "--bird-mid-y": "-6px",
      "--bird-end-y": "14px",
    },
  },
  {
    className: "bloom-bird bloom-bird-section bloom-bird-soft",
    style: {
      "--bird-top": "24%",
      "--bird-scale": "0.44",
      "--bird-duration": "60s",
      "--bird-delay": "-47s",
      "--bird-start-y": "-5px",
      "--bird-mid-y": "8px",
      "--bird-end-y": "-11px",
    },
  },
];

function BirdField({ birds, className }: { birds: Bird[]; className: string }) {
  return (
    <div className={className} aria-hidden="true">
      {birds.map((bird, index) => (
        <span key={index} className={bird.className} style={bird.style} />
      ))}
    </div>
  );
}

export function AboutBirdFlock() {
  return (
    <BirdField
      birds={ABOUT_BIRDS}
      className="bloom-bird-field bloom-bird-field-section bloom-bird-field-about"
    />
  );
}

export function FAQBirdFlock() {
  return (
    <BirdField
      birds={FAQ_BIRDS}
      className="bloom-bird-field bloom-bird-field-section bloom-bird-field-faq"
    />
  );
}

export default function AnimatedBirds() {
  return <BirdField birds={SKY_BIRDS} className="bloom-bird-field" />;
}
