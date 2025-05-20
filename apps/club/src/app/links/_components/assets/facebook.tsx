import type { SVGProps } from "react";
import * as React from "react";

export default function FacebookSVG(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="77"
      height="77"
      viewBox="0 0 77 77"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M57.7499 6.41663H48.1249C43.8704 6.41663 39.7901 8.10673 36.7817 11.1151C33.7734 14.1235 32.0833 18.2038 32.0833 22.4583V32.0833H22.4583V44.9166H32.0833V70.5833H44.9166V44.9166H54.5416L57.7499 32.0833H44.9166V22.4583C44.9166 21.6074 45.2546 20.7913 45.8563 20.1897C46.458 19.588 47.274 19.25 48.1249 19.25H57.7499V6.41663Z"
        stroke="#D8B4FE"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
