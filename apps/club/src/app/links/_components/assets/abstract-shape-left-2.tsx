import type { SVGProps } from "react";
import * as React from "react";

export default function AbstractShapeLeft2SVG(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="849"
      height="430"
      viewBox="0 0 849 430"
      overflow="visible"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g filter="url(#filter0_dd_314_4705)">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M459.223 56.2063C416.155 40.8641 367.879 83.5656 341.403 120.944C317.054 155.319 360.687 219.81 326.232 243.961C223.231 316.16 23.342 255.495 -19.5869 373.981C-52.4511 464.689 161.062 437.487 232.836 501.739C290.214 553.104 270.801 675.095 343.813 699.297C416.098 723.257 502.613 667.805 547.327 605.984C589.358 547.873 550.244 466.125 563.496 395.565C568.478 369.04 581.643 344.898 600.057 325.221C659.715 261.475 828.891 231.598 790.353 153.165C751.297 73.6787 618.052 214.118 533.269 189.293C483.657 174.766 507.926 73.5557 459.223 56.2063Z"
          stroke="#C084FC"
          stroke-width="5"
        />
      </g>
      <defs>
        <filter
          id="filter0_dd_314_4705"
          x="-75.5002"
          y="0.497559"
          width="924"
          height="757.003"
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
            result="effect1_dropShadow_314_4705"
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
            in2="effect1_dropShadow_314_4705"
            result="effect2_dropShadow_314_4705"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect2_dropShadow_314_4705"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
}
