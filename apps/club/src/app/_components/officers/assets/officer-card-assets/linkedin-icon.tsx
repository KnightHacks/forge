import type { SVGProps } from "react";
import * as React from "react";

const LinkedInSVG = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    viewBox="-2 -2 45 45"
    {...props}
  >
    <g
      stroke="#F4F4ED"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3.5}
      filter="url(#a)"
    >
      <path d="M27.73 13.866a10.4 10.4 0 0 1 10.399 10.399v12.133h-6.933V24.265a3.466 3.466 0 1 0-6.933 0v12.133h-6.933V24.265a10.4 10.4 0 0 1 10.4-10.399ZM10.4 15.6H3.466v20.798H10.4V15.6ZM6.933 10.399a3.466 3.466 0 1 0 0-6.933 3.466 3.466 0 0 0 0 6.933Z" />
    </g>
    <defs>
      <filter
        id="a"
        width={41.596}
        height={41.596}
        x={0}
        y={0}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" />
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_394_5179"
        />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" />
        <feBlend
          in2="effect1_dropShadow_394_5179"
          result="effect2_dropShadow_394_5179"
        />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" />
        <feBlend
          in2="effect2_dropShadow_394_5179"
          result="effect3_dropShadow_394_5179"
        />
        <feBlend
          in="SourceGraphic"
          in2="effect3_dropShadow_394_5179"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
);
export default LinkedInSVG;
