import type { SVGProps } from "react";
import * as React from "react";

export default function AbstractShapeRight2SVG(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="235"
      height="493"
      viewBox="0 0 235 493"
      overflow="visible"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g filter="url(#filter0_dd_314_4710)">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M107.898 161.104C92.3891 174.516 98.3667 202.791 107.089 221.385C115.111 238.484 149.913 235.718 151.712 254.5C157.092 310.648 89.2246 375.224 125.942 418.168C154.051 451.043 190.662 361.726 231.594 347.927C264.317 336.897 307.602 371.44 333.188 348.304C358.519 325.399 356.025 279.386 341.803 248.273C328.434 219.027 287.901 216.215 263.313 195.446C254.069 187.638 247.565 177.164 243.964 165.63C232.296 128.261 258.057 55.6512 218.944 53.3474C179.306 51.0126 204.612 134.047 176.179 161.637C159.541 177.782 125.435 145.938 107.898 161.104Z"
          stroke="#C084FC"
          stroke-width="5"
        />
      </g>
      <defs>
        <filter
          id="filter0_dd_314_4710"
          x="45.8066"
          y="0.799316"
          width="359.111"
          height="477.085"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="12.5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.494118 0 0 0 0 0.133333 0 0 0 0 0.807843 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_314_4710"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="25" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.494118 0 0 0 0 0.133333 0 0 0 0 0.807843 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="effect1_dropShadow_314_4710"
            result="effect2_dropShadow_314_4710"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect2_dropShadow_314_4710"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
}
