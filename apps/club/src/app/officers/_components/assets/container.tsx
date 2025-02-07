import type { SVGProps } from "react";
import * as React from "react";

const Container = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1105"
    height="1124"
    fill="none"
    viewBox="0 0 1105 1124"
    {...props}
  >
    <g filter="url(#filter0_dddd_394_5173)" opacity="0.98">
      <path
        fill="url(#paint0_radial_394_5173)"
        fillOpacity="0.7"
        d="M107 157c0-27.614 22.386-50 50-50h790.873c27.614 0 50 22.386 50 50v809.663c0 27.615-22.386 49.997-50 49.997H157c-27.614 0-50-22.382-50-49.997z"
      ></path>
      <path
        stroke="#D7B4FE"
        strokeWidth="5"
        d="M157 104.5c-28.995 0-52.5 23.505-52.5 52.5v809.663c0 28.995 23.505 52.497 52.5 52.497h790.873c28.995 0 52.497-23.502 52.497-52.497V157c0-28.995-23.502-52.5-52.497-52.5z"
      ></path>
    </g>
    <defs>
      <radialGradient
        id="paint0_radial_394_5173"
        cx="0"
        cy="0"
        r="1"
        gradientTransform="matrix(-3.70296 655.42654 -811.39005 -4.5841 555.082 191.373)"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#C084FC" stopOpacity="0"></stop>
        <stop offset="0" stopColor="#B77EF1" stopOpacity="0.045"></stop>
        <stop offset="0.15" stopColor="#6B4C93" stopOpacity="0.441"></stop>
        <stop offset="0.287" stopColor="#433160" stopOpacity="0.651"></stop>
        <stop offset="0.534" stopColor="#1C172F" stopOpacity="0.855"></stop>
        <stop offset="0.869" stopColor="#00050D"></stop>
      </radialGradient>
      <filter
        id="filter0_dddd_394_5173"
        width="1104.27"
        height="1123.06"
        x="0.301"
        y="0.301"
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feGaussianBlur stdDeviation="3.632"></feGaussianBlur>
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_394_5173"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feGaussianBlur stdDeviation="7.264"></feGaussianBlur>
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect1_dropShadow_394_5173"
          result="effect2_dropShadow_394_5173"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feGaussianBlur stdDeviation="25.425"></feGaussianBlur>
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect2_dropShadow_394_5173"
          result="effect3_dropShadow_394_5173"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feGaussianBlur stdDeviation="50.85"></feGaussianBlur>
        <feColorMatrix values="0 0 0 0 0.419608 0 0 0 0 0.129412 0 0 0 0 0.658824 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect3_dropShadow_394_5173"
          result="effect4_dropShadow_394_5173"
        ></feBlend>
        <feBlend
          in="SourceGraphic"
          in2="effect4_dropShadow_394_5173"
          result="shape"
        ></feBlend>
      </filter>
    </defs>
  </svg>
);

export default Container;
