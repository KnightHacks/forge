import type { SVGProps } from "react";
import * as React from "react";

export default function BlankCalendarSVG(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="50"
      height="50"
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clip-path="url(#clip0_314_3829)">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M16.0714 3.57143C16.0714 1.59898 14.4724 0 12.5 0C10.5276 0 8.92857 1.59898 8.92857 3.57143V7.14286H5.35714C2.39847 7.14286 0 9.54132 0 12.5V17.8571H50V12.5C50 9.54132 47.6014 7.14286 44.6429 7.14286H41.0718V3.57143C41.0718 1.59898 39.4729 0 37.5004 0C35.5279 0 33.9289 1.59898 33.9289 3.57143V7.14286H16.0714V3.57143ZM50 22.3214H0V44.6429C0 47.6014 2.39847 50 5.35714 50H44.6429C47.6014 50 50 47.6014 50 44.6429V22.3214Z"
          fill="white"
        />
      </g>
      <defs>
        <clipPath id="clip0_314_3829">
          <rect width="50" height="50" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
