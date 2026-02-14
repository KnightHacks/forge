import * as React from "react";

const RoundMajorSVG: React.FC<{ major: string; className: string }> = ({
  major,
  className,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="381"
    height="333"
    fill="none"
    viewBox="0 0 381 333"
    className={className}
  >
    <g filter="url(#filter0_dddddd_0_1)">
      <path
        fill="#7F5CFF"
        d="M176.427 312.797c-3.631 0-6.588 3.237-6.588 7.211s2.957 7.211 6.588 7.211c3.63 0 6.587-3.237 6.587-7.211s-2.957-7.211-6.587-7.211m0 19.664c-6.276 0-11.376-5.584-11.376-12.453s5.1-12.452 11.376-12.452 11.375 5.583 11.375 12.452-5.1 12.453-11.375 12.453"
      ></path>
    </g>
    <g filter="url(#filter1_dddddd_0_1)">
      <path
        fill="#7F5CFF"
        d="M178.817 310.173h-4.789v-44.569H13.559V49.54L58.077.817h38.111V6.06H60.065l-41.71 45.648v208.655h160.462z"
      ></path>
    </g>
    <g filter="url(#filter2_dddddd_0_1)">
      <path
        fill="#7F5CFF"
        d="M307.943 265.604H185.109v-5.242h120.854l52.485-57.453V6.059H176.427V.817h186.81v204.268z"
      ></path>
    </g>
    <g filter="url(#filter3_dddddd_0_1)">
      <path
        fill="#2A1E54"
        d="m61.617 20.003-32.485 35.56v191.644h267.065l50.021-54.755V20.003z"
      ></path>
    </g>
    <g filter="url(#filter4_dddddd_0_1)">
      <path
        fill="#7F5CFF"
        d="M13.56 192.335v73.269l53.84.395-13.463 14.737H.105v-73.664z"
      ></path>
    </g>
    <g filter="url(#filter5_dddddd_0_1)">
      <path
        fill="#7F5CFF"
        d="M380.329 96.896c-2.587 0-4.682-2.293-4.682-5.125h-4.681v15.375h4.681c0-2.832 2.095-5.125 4.682-5.125z"
      ></path>
    </g>
    <g filter="url(#filter6_dddddd_0_1)">
      <path
        fill="#7F5CFF"
        d="M380.329 117.395c-2.587 0-4.682-2.292-4.682-5.124h-4.681v15.374h4.681c0-2.832 2.095-5.125 4.682-5.125z"
      ></path>
    </g>
    <g filter="url(#filter7_dddddd_0_1)">
      <path
        fill="#7F5CFF"
        d="M380.329 137.894c-2.587 0-4.682-2.292-4.682-5.124h-4.681v15.374h4.681c0-2.832 2.095-5.125 4.682-5.125z"
      ></path>
    </g>
    <g filter="url(#filter8_dddddd_0_1)">
      <path
        fill="#7F5CFF"
        d="M380.329 35.406c-2.587 0-4.682-2.293-4.682-5.125h-4.681v15.375h4.681c0-2.833 2.095-5.125 4.682-5.125z"
      ></path>
    </g>
    <g filter="url(#filter9_dddddd_0_1)">
      <path
        fill="#7F5CFF"
        d="M380.329 55.896c-2.587 0-4.682-2.292-4.682-5.124h-4.681v15.374h4.681c0-2.832 2.095-5.125 4.682-5.125z"
      ></path>
    </g>
    <g filter="url(#filter10_dddddd_0_1)">
      <path
        fill="#7F5CFF"
        d="M380.329 76.396c-2.587 0-4.682-2.293-4.682-5.125h-4.681v15.375h4.681c0-2.832 2.095-5.125 4.682-5.125z"
      ></path>
    </g>

    <text
      x="50%"
      y="35%"
      fill="#fff"
      fontSize="42"
      fontFamily="Poppins, sans-serif"
      textAnchor="middle"
      dominantBaseline="middle"
      fontWeight="bold"
    >
      {major.split(" ").map((line, index) => (
        <tspan key={index} x="50%" dy={index === 0 ? "0" : "1.2em"}>
          {line}
        </tspan>
      ))}
    </text>

    <defs>
      <filter
        id="filter0_dddddd_0_1"
        width="22.752"
        height="24.905"
        x="165.051"
        y="307.556"
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect1_dropShadow_0_1"
          result="effect2_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect2_dropShadow_0_1"
          result="effect3_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect3_dropShadow_0_1"
          result="effect4_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect4_dropShadow_0_1"
          result="effect5_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect5_dropShadow_0_1"
          result="effect6_dropShadow_0_1"
        ></feBlend>
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        ></feBlend>
      </filter>
      <filter
        id="filter1_dddddd_0_1"
        width="165.258"
        height="309.355"
        x="13.559"
        y="0.817"
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect1_dropShadow_0_1"
          result="effect2_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect2_dropShadow_0_1"
          result="effect3_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect3_dropShadow_0_1"
          result="effect4_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect4_dropShadow_0_1"
          result="effect5_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect5_dropShadow_0_1"
          result="effect6_dropShadow_0_1"
        ></feBlend>
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        ></feBlend>
      </filter>
      <filter
        id="filter2_dddddd_0_1"
        width="186.81"
        height="264.787"
        x="176.427"
        y="0.817"
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect1_dropShadow_0_1"
          result="effect2_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect2_dropShadow_0_1"
          result="effect3_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect3_dropShadow_0_1"
          result="effect4_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect4_dropShadow_0_1"
          result="effect5_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect5_dropShadow_0_1"
          result="effect6_dropShadow_0_1"
        ></feBlend>
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        ></feBlend>
      </filter>
      <filter
        id="filter3_dddddd_0_1"
        width="317.086"
        height="227.204"
        x="29.132"
        y="20.003"
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.164706 0 0 0 0 0.117647 0 0 0 0 0.329412 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.164706 0 0 0 0 0.117647 0 0 0 0 0.329412 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect1_dropShadow_0_1"
          result="effect2_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.164706 0 0 0 0 0.117647 0 0 0 0 0.329412 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect2_dropShadow_0_1"
          result="effect3_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.164706 0 0 0 0 0.117647 0 0 0 0 0.329412 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect3_dropShadow_0_1"
          result="effect4_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.164706 0 0 0 0 0.117647 0 0 0 0 0.329412 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect4_dropShadow_0_1"
          result="effect5_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.164706 0 0 0 0 0.117647 0 0 0 0 0.329412 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect5_dropShadow_0_1"
          result="effect6_dropShadow_0_1"
        ></feBlend>
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        ></feBlend>
      </filter>
      <filter
        id="filter4_dddddd_0_1"
        width="67.294"
        height="88.4"
        x="0.105"
        y="192.335"
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect1_dropShadow_0_1"
          result="effect2_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect2_dropShadow_0_1"
          result="effect3_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect3_dropShadow_0_1"
          result="effect4_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect4_dropShadow_0_1"
          result="effect5_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect5_dropShadow_0_1"
          result="effect6_dropShadow_0_1"
        ></feBlend>
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        ></feBlend>
      </filter>
      <filter
        id="filter5_dddddd_0_1"
        width="9.363"
        height="15.374"
        x="370.966"
        y="91.771"
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect1_dropShadow_0_1"
          result="effect2_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect2_dropShadow_0_1"
          result="effect3_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect3_dropShadow_0_1"
          result="effect4_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect4_dropShadow_0_1"
          result="effect5_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect5_dropShadow_0_1"
          result="effect6_dropShadow_0_1"
        ></feBlend>
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        ></feBlend>
      </filter>
      <filter
        id="filter6_dddddd_0_1"
        width="9.363"
        height="15.374"
        x="370.966"
        y="112.271"
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect1_dropShadow_0_1"
          result="effect2_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect2_dropShadow_0_1"
          result="effect3_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect3_dropShadow_0_1"
          result="effect4_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect4_dropShadow_0_1"
          result="effect5_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect5_dropShadow_0_1"
          result="effect6_dropShadow_0_1"
        ></feBlend>
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        ></feBlend>
      </filter>
      <filter
        id="filter7_dddddd_0_1"
        width="9.363"
        height="15.374"
        x="370.966"
        y="132.77"
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect1_dropShadow_0_1"
          result="effect2_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect2_dropShadow_0_1"
          result="effect3_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect3_dropShadow_0_1"
          result="effect4_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect4_dropShadow_0_1"
          result="effect5_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect5_dropShadow_0_1"
          result="effect6_dropShadow_0_1"
        ></feBlend>
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        ></feBlend>
      </filter>
      <filter
        id="filter8_dddddd_0_1"
        width="9.363"
        height="15.374"
        x="370.966"
        y="30.281"
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect1_dropShadow_0_1"
          result="effect2_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect2_dropShadow_0_1"
          result="effect3_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect3_dropShadow_0_1"
          result="effect4_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect4_dropShadow_0_1"
          result="effect5_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect5_dropShadow_0_1"
          result="effect6_dropShadow_0_1"
        ></feBlend>
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        ></feBlend>
      </filter>
      <filter
        id="filter9_dddddd_0_1"
        width="9.363"
        height="15.374"
        x="370.966"
        y="50.772"
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect1_dropShadow_0_1"
          result="effect2_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect2_dropShadow_0_1"
          result="effect3_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect3_dropShadow_0_1"
          result="effect4_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect4_dropShadow_0_1"
          result="effect5_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect5_dropShadow_0_1"
          result="effect6_dropShadow_0_1"
        ></feBlend>
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        ></feBlend>
      </filter>
      <filter
        id="filter10_dddddd_0_1"
        width="9.363"
        height="15.374"
        x="370.966"
        y="71.271"
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect1_dropShadow_0_1"
          result="effect2_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect2_dropShadow_0_1"
          result="effect3_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect3_dropShadow_0_1"
          result="effect4_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect4_dropShadow_0_1"
          result="effect5_dropShadow_0_1"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></feColorMatrix>
        <feOffset></feOffset>
        <feColorMatrix values="0 0 0 0 0.498039 0 0 0 0 0.360784 0 0 0 0 1 0 0 0 1 0"></feColorMatrix>
        <feBlend
          in2="effect5_dropShadow_0_1"
          result="effect6_dropShadow_0_1"
        ></feBlend>
        <feBlend
          in="SourceGraphic"
          in2="effect6_dropShadow_0_1"
          result="shape"
        ></feBlend>
      </filter>
    </defs>
  </svg>
);

export default RoundMajorSVG;
