import type { SVGProps } from "react";
import * as React from "react";

export default function AbstractShapeLeft1SVG(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="559"
      height="594"
      viewBox="0 0 559 594"
      overflow="visible"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g filter="url(#filter0_dd_314_5243)">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M164.677 57.5162C121.051 42.1759 68.3391 70.1938 38.5416 96.0969C11.139 119.918 52.2217 172.406 15.0036 187.628C-96.2594 233.134 -299.407 169.894 -351.404 255.583C-391.21 321.182 -168.363 319.288 -98.1201 374.053C-41.9672 417.833 -69.8337 508.221 4.23922 532.862C77.5736 557.258 170.698 522.954 220.938 480.193C268.163 439.999 232.858 374.879 251.071 322.775C257.918 303.189 273.088 286.114 293.41 272.87C359.249 229.961 536.35 222.176 501.43 159.609C466.041 96.2016 319.115 190.577 232.891 164.437C182.437 149.141 214.01 74.8635 164.677 57.5162Z"
          stroke="#C084FC"
          stroke-width="5"
        />
      </g>
      <defs>
        <filter
          id="filter0_dd_314_5243"
          x="-408.629"
          y="0.650146"
          width="967.073"
          height="592.841"
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
            result="effect1_dropShadow_314_5243"
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
            in2="effect1_dropShadow_314_5243"
            result="effect2_dropShadow_314_5243"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect2_dropShadow_314_5243"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
}
