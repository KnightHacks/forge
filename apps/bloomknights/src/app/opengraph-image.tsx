import { ImageResponse } from "next/og";

import {
  OG_IMAGE_ALT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
} from "./seo";

export const runtime = "edge";
export const alt = OG_IMAGE_ALT;
export const size = {
  width: OG_IMAGE_WIDTH,
  height: OG_IMAGE_HEIGHT,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f5ebd5",
        }}
      >
        <img
          src={OG_IMAGE_URL}
          alt=""
          width={OG_IMAGE_WIDTH}
          height={OG_IMAGE_HEIGHT}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
    ),
    size,
  );
}
