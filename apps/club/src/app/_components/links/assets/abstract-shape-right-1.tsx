import type { SVGProps } from "react";
import * as React from "react";

export default function AbstractShapeRight1SVG(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="525"
      height="748"
      viewBox="0 0 525 748"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g filter="url(#filter0_dd_314_4707)">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M290.423 552.313C255.907 536.708 251.651 483.478 257.342 445.956C262.576 411.45 325.683 398.055 319.009 363.838C299.06 261.549 144.923 182.834 187.424 87.4617C219.961 14.4492 331.714 153.421 411.475 156.346C475.237 158.685 533.783 74.7397 591.258 102.273C648.16 129.531 667.901 212.351 659.04 274.941C650.711 333.775 580.38 360.064 547.724 409.781C535.448 428.47 529.424 450.443 529.099 472.769C528.048 545.098 611.809 660.178 543.727 684.82C474.731 709.793 475.966 549.402 411.109 515.475C373.158 495.622 329.455 569.959 290.423 552.313Z"
          stroke="#C084FC"
          stroke-width="5"
        />
      </g>
      <defs>
        <filter
          id="filter0_dd_314_4707"
          x="127.547"
          y="13.784"
          width="586.021"
          height="726.164"
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
            result="effect1_dropShadow_314_4707"
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
            in2="effect1_dropShadow_314_4707"
            result="effect2_dropShadow_314_4707"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect2_dropShadow_314_4707"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
}
