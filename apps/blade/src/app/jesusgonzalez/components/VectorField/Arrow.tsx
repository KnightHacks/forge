import React from "react";

import type { Vector2 } from "./types";

interface ArrowProps {
  start: Vector2;
  vector: Vector2;
  scale?: number;
  color?: string;
}

const Arrow = ({
  start,
  vector,
  scale = 10,
  color = "#8b5cf6",
}: ArrowProps) => {
  const end = {
    x: start.x + vector.x * scale,
    y: start.y - vector.y * scale,
  };
  const angle: number = Math.atan2(-vector.y, vector.x);
  const headLength = 4;

  const head1 = {
    x: end.x - headLength * Math.cos(angle - Math.PI / 6),
    y: end.y - headLength * Math.sin(angle - Math.PI / 6),
  };
  const head2 = {
    x: end.x - headLength * Math.cos(angle + Math.PI / 6),
    y: end.y - headLength * Math.sin(angle + Math.PI / 6),
  };

  return (
    <g>
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={color}
        strokeWidth={1.5}
      />
      <polygon
        points={`${end.x},${end.y} ${head1.x} ${head1.y} ${head2.x} ${head2.y}`}
        fill={color}
      />
    </g>
  );
};

export default Arrow;
