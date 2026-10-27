import type { ReactNode } from "react";

import type { ProjectArtworkKind } from "~/content/projects";

const artworkLabels: Record<ProjectArtworkKind, string> = {
  signal: "A topographic signal map",
  relay: "A node network on a dark teal field",
  margin: "Layered reading notes and annotations",
  chord: "A waveform and sequencer grid",
  canopy: "Aerial image tile with tree canopy detection",
  rover: "A small rover following a waypoint route",
};

const illustrations: Record<ProjectArtworkKind, ReactNode> = {
  signal: (
    <svg viewBox="0 0 720 420" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 300C100 255 152 286 220 235s111-37 180-90 134-27 320-118M-30 347c116-54 174-9 258-68s116-35 186-88 157-19 336-95M-20 390c113-42 185-6 273-59s115-54 189-102 140-16 283-83"
        stroke="#c4a5ff"
        strokeOpacity=".24"
        strokeWidth="2"
      />
      <path
        d="M20 0v420M120 0v420M220 0v420M320 0v420M420 0v420M520 0v420M620 0v420M0 70h720M0 170h720M0 270h720M0 370h720"
        stroke="#fff"
        strokeOpacity=".055"
      />
      <path
        d="M474 96c0-26 21-47 47-47s47 21 47 47c0 36-47 83-47 83s-47-47-47-83Z"
        fill="#d5ec82"
      />
      <circle cx="521" cy="96" r="14" fill="#283111" />
      <circle cx="228" cy="282" r="8" fill="#bd9bff" />
      <circle cx="228" cy="282" r="25" stroke="#bd9bff" strokeOpacity=".5" />
      <rect
        x="40"
        y="36"
        width="160"
        height="36"
        rx="18"
        fill="#221b2d"
        stroke="#bd9bff"
        strokeOpacity=".36"
      />
      <circle cx="60" cy="54" r="4" fill="#d5ec82" />
      <path d="M74 54h95" stroke="#ded4ed" strokeOpacity=".7" strokeWidth="3" />
    </svg>
  ),
  relay: (
    <svg viewBox="0 0 720 420" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M116 212 248 122l121 114 127-113 108 69M116 212l119 109 134-85 127 85 108-129M248 122l-13 199M369 236l-1-155M496 123v197M604 192v110"
        stroke="#8fcab6"
        strokeOpacity=".52"
        strokeWidth="2"
      />
      <path
        d="M0 330h720M0 90h720M110 0v420M250 0v420M390 0v420M530 0v420"
        stroke="#fff"
        strokeOpacity=".045"
      />
      <circle cx="116" cy="212" r="18" fill="#d5ec82" />
      <circle cx="248" cy="122" r="14" fill="#9bb8ff" />
      <circle cx="369" cy="236" r="22" fill="#bd9bff" />
      <circle cx="496" cy="123" r="14" fill="#d5ec82" />
      <circle cx="604" cy="192" r="18" fill="#9bb8ff" />
      <circle cx="235" cy="321" r="12" fill="#8fcab6" />
      <circle cx="496" cy="320" r="12" fill="#8fcab6" />
      <rect
        x="42"
        y="35"
        width="180"
        height="38"
        rx="19"
        fill="#102626"
        stroke="#8fcab6"
        strokeOpacity=".42"
      />
      <path
        d="M62 54h54"
        stroke="#e1f4ed"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  ),
  margin: (
    <svg viewBox="0 0 720 420" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="144"
        y="57"
        width="346"
        height="300"
        rx="5"
        fill="#ddd4c2"
        transform="rotate(-4 144 57)"
      />
      <rect
        x="184"
        y="79"
        width="346"
        height="300"
        rx="5"
        fill="#f0e9d9"
        transform="rotate(3 184 79)"
      />
      <path
        d="M244 142h220M244 170h192M244 198h218M244 226h129M244 279h209M244 307h177"
        stroke="#4b4650"
        strokeOpacity=".25"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect
        x="380"
        y="184"
        width="220"
        height="126"
        rx="4"
        fill="#251e30"
        stroke="#bd9bff"
        strokeWidth="2"
        transform="rotate(5 380 184)"
      />
      <path
        d="m409 222 20 17-20 17M446 257h91"
        stroke="#d5ec82"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M143 103h72M143 120h36"
        stroke="#987baa"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="556" cy="103" r="18" fill="#d5ec82" />
    </svg>
  ),
  chord: (
    <svg viewBox="0 0 720 420" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 210h720M0 105h720M0 315h720"
        stroke="#fff"
        strokeOpacity=".08"
      />
      <path
        d="M80 0v420M180 0v420M280 0v420M380 0v420M480 0v420M580 0v420"
        stroke="#fff"
        strokeOpacity=".06"
      />
      <path
        d="M0 221c37 0 37-123 75-123s38 204 76 204 38-151 76-151 38 88 76 88 38-154 76-154 38 203 76 203 38-111 76-111 38 50 76 50 38-79 76-79 38 63 76 63"
        stroke="#bd9bff"
        strokeWidth="4"
      />
      <rect x="110" y="281" width="48" height="57" rx="5" fill="#d5ec82" />
      <rect x="210" y="247" width="48" height="91" rx="5" fill="#9bb8ff" />
      <rect x="310" y="293" width="48" height="45" rx="5" fill="#bd9bff" />
      <rect x="410" y="230" width="48" height="108" rx="5" fill="#d5ec82" />
      <rect x="510" y="270" width="48" height="68" rx="5" fill="#9bb8ff" />
      <rect x="610" y="252" width="48" height="86" rx="5" fill="#bd9bff" />
    </svg>
  ),
  canopy: (
    <svg viewBox="0 0 720 420" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 70h720M0 170h720M0 270h720M0 370h720M120 0v420M260 0v420M400 0v420M540 0v420"
        stroke="#fff"
        strokeOpacity=".07"
      />
      <path
        d="M78 283c27-52 76-68 117-46 15-52 73-73 116-44 31-39 88-31 106 14 47-19 96 5 102 53 45 5 67 36 73 72H54c2-21 9-39 24-49Z"
        fill="#43856a"
        fillOpacity=".72"
        stroke="#9fe5a7"
        strokeWidth="3"
      />
      <path
        d="M101 284c25-41 61-48 94-34 24-43 70-51 105-26 28-27 72-21 91 12 39-11 70 7 76 40"
        stroke="#d5ec82"
        strokeWidth="4"
        strokeDasharray="9 8"
      />
      <rect
        x="426"
        y="48"
        width="224"
        height="72"
        rx="5"
        fill="#1c0925"
        stroke="#ffb62b"
        strokeOpacity=".7"
      />
      <path
        d="M448 73h82M448 94h48"
        stroke="#f8f7f3"
        strokeOpacity=".65"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="612" cy="84" r="13" fill="#ffb62b" />
      <circle cx="613" cy="84" r="5" fill="#140316" />
      <path d="m541 190 25-24 25 24-25 24-25-24Z" fill="#f74f83" />
      <path
        d="m566 166 47-36"
        stroke="#f74f83"
        strokeWidth="2"
        strokeDasharray="5 6"
      />
    </svg>
  ),
  rover: (
    <svg viewBox="0 0 720 420" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 88h720M0 188h720M0 288h720M90 0v420M230 0v420M370 0v420M510 0v420M650 0v420"
        stroke="#fff"
        strokeOpacity=".06"
      />
      <path
        d="M90 320c72-104 127-25 193-115 66-90 136 28 199-55 42-55 84-59 142-67"
        stroke="#ffb62b"
        strokeWidth="4"
        strokeDasharray="10 9"
      />
      <circle cx="90" cy="320" r="12" fill="#f74f83" />
      <circle cx="624" cy="83" r="15" fill="#d5ec82" />
      <rect
        x="296"
        y="207"
        width="148"
        height="76"
        rx="9"
        fill="#59168b"
        stroke="#fff"
        strokeWidth="3"
      />
      <path
        d="m326 207 18-39h52l18 39"
        fill="#311037"
        stroke="#fff"
        strokeWidth="3"
      />
      <rect x="341" y="180" width="32" height="18" rx="4" fill="#86d7e8" />
      <circle
        cx="322"
        cy="291"
        r="23"
        fill="#09010d"
        stroke="#ffb62b"
        strokeWidth="5"
      />
      <circle
        cx="418"
        cy="291"
        r="23"
        fill="#09010d"
        stroke="#ffb62b"
        strokeWidth="5"
      />
      <path
        d="m356 207 16-32 18 32M372 175v-22"
        stroke="#ffb62b"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="372" cy="149" r="7" fill="#f74f83" />
    </svg>
  ),
};

export function ProjectArtwork({ kind }: { kind: ProjectArtworkKind }) {
  return (
    <div className={`artwork artwork-${kind}`} aria-hidden="true">
      {illustrations[kind]}
      <span className="sr-only">{artworkLabels[kind]}</span>
    </div>
  );
}
