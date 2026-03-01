import type { SVGProps } from "react";
import * as React from "react";

export default function LinkedinSVG(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M42.6666 21.3334C46.9101 21.3334 50.9797 23.0191 53.9803 26.0197C56.9809 29.0202 58.6666 33.0899 58.6666 37.3334V56H47.9999V37.3334C47.9999 35.9189 47.438 34.5623 46.4378 33.5621C45.4376 32.5619 44.0811 32 42.6666 32C41.2521 32 39.8955 32.5619 38.8954 33.5621C37.8952 34.5623 37.3333 35.9189 37.3333 37.3334V56H26.6666V37.3334C26.6666 33.0899 28.3523 29.0202 31.3529 26.0197C34.3535 23.0191 38.4231 21.3334 42.6666 21.3334Z"
        stroke="#D8B4FE"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M15.9999 24H5.33325V56H15.9999V24Z"
        stroke="#D8B4FE"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M10.6666 16C13.6121 16 15.9999 13.6122 15.9999 10.6667C15.9999 7.72119 13.6121 5.33337 10.6666 5.33337C7.72107 5.33337 5.33325 7.72119 5.33325 10.6667C5.33325 13.6122 7.72107 16 10.6666 16Z"
        stroke="#D8B4FE"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
