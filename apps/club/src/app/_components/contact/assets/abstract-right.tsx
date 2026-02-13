import type { SVGProps } from "react";
import * as React from "react";

const AbstractRight = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={456}
    height={385}
    viewBox="0 0 456 385"
    fill="none"
    {...props}
  >
    <g filter="url(#abstract-right-a)">
      <path
        stroke="#C084FC"
        strokeWidth={5}
        d="M259.132 54.37c-18.41-6.557-39.046 11.694-50.364 27.67-10.408 14.692 8.243 42.255-6.485 52.578-44.029 30.858-129.474 4.929-147.824 55.571-14.048 38.769 77.22 27.142 107.901 54.604 24.527 21.954 16.229 74.093 47.439 84.437 30.899 10.241 67.88-13.459 86.994-39.882 17.966-24.837 1.247-59.776 6.912-89.934 2.129-11.337 7.757-21.656 15.628-30.065 25.502-27.246 97.818-40.016 81.344-73.538-16.695-33.973-73.652 26.052-109.894 15.441-21.207-6.209-10.833-49.466-31.651-56.882Z"
        clipRule="evenodd"
        shapeRendering="crispEdges"
      />
    </g>
    <defs>
      <filter
        id="abstract-right-a"
        width={455.091}
        height={383.671}
        x={0.5}
        y={0.498}
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
        <feGaussianBlur stdDeviation={12.5} />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix values="0 0 0 0 0.494118 0 0 0 0 0.133333 0 0 0 0 0.807843 0 0 0 1 0" />
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_121_1373"
        />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset />
        <feGaussianBlur stdDeviation={25} />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix values="0 0 0 0 0.494118 0 0 0 0 0.133333 0 0 0 0 0.807843 0 0 0 1 0" />
        <feBlend
          in2="effect1_dropShadow_121_1373"
          result="effect2_dropShadow_121_1373"
        />
        <feBlend
          in="SourceGraphic"
          in2="effect2_dropShadow_121_1373"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
);
export default AbstractRight;
