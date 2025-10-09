import type { SVGProps } from "react";
import * as React from "react";

const Shield = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 270 346"
    fill="none"
    {...props}
  >
    <path
      stroke="#C084FC"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={5}
      d="M135.217 342.671a5.402 5.402 0 0 1-3.767 0C115.283 336.889 0 290.975 0 160.237V42.084a6.891 6.891 0 0 1 1.407-4.196 6.656 6.656 0 0 1 3.643-2.42l126.667-32.36a6.537 6.537 0 0 1 3.233 0l126.667 32.36a6.654 6.654 0 0 1 3.642 2.42 6.89 6.89 0 0 1 1.408 4.196v118.153c0 132.047-115.267 176.805-131.45 182.451v-.017Z"
    />
  </svg>
);
export default Shield;
