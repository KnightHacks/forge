import type { CSSProperties } from "react";

import styles from "./Hero.module.css";

interface FallingLeaf {
  delay: string;
  drift: string;
  duration: string;
  fill: string;
  opacity: number;
  rotate: string;
  size: string;
  x: string;
}

type LeafVars = Record<
  | "--leaf-delay"
  | "--leaf-drift"
  | "--leaf-duration"
  | "--leaf-fill"
  | "--leaf-opacity"
  | "--leaf-rotate"
  | "--leaf-size"
  | "--leaf-x",
  string | number
>;

const FALLING_LEAVES: FallingLeaf[] = [
  {
    x: "52%",
    size: "22px",
    duration: "9.6s",
    delay: "-1.8s",
    opacity: 0.5,
    fill: "#b987ff",
    drift: "-38px",
    rotate: "280deg",
  },
  {
    x: "61%",
    size: "18px",
    duration: "11.2s",
    delay: "-6.4s",
    opacity: 0.42,
    fill: "#9b6dff",
    drift: "51px",
    rotate: "340deg",
  },
  {
    x: "70%",
    size: "25px",
    duration: "10.4s",
    delay: "-3.2s",
    opacity: 0.46,
    fill: "#d19aff",
    drift: "-61px",
    rotate: "390deg",
  },
  {
    x: "79%",
    size: "20px",
    duration: "12.8s",
    delay: "-8.5s",
    opacity: 0.38,
    fill: "#8752f0",
    drift: "45px",
    rotate: "320deg",
  },
  {
    x: "86%",
    size: "18px",
    duration: "8.9s",
    delay: "-4.9s",
    opacity: 0.44,
    fill: "#c08cff",
    drift: "-29px",
    rotate: "250deg",
  },
  {
    x: "47%",
    size: "19px",
    duration: "10.8s",
    delay: "-7.2s",
    opacity: 0.4,
    fill: "#a66cff",
    drift: "35px",
    rotate: "310deg",
  },
  {
    x: "57%",
    size: "26px",
    duration: "13.4s",
    delay: "-10.6s",
    opacity: 0.34,
    fill: "#cf95ff",
    drift: "-48px",
    rotate: "420deg",
  },
  {
    x: "66%",
    size: "18px",
    duration: "9.2s",
    delay: "-0.9s",
    opacity: 0.46,
    fill: "#8f5bf5",
    drift: "59px",
    rotate: "270deg",
  },
  {
    x: "74%",
    size: "23px",
    duration: "12.1s",
    delay: "-5.7s",
    opacity: 0.37,
    fill: "#b47aff",
    drift: "-43px",
    rotate: "365deg",
  },
  {
    x: "91%",
    size: "21px",
    duration: "10s",
    delay: "-2.6s",
    opacity: 0.43,
    fill: "#d3a2ff",
    drift: "30px",
    rotate: "295deg",
  },
];

export function FallingLeaves() {
  return (
    <div className={styles.leafField} aria-hidden="true">
      {FALLING_LEAVES.map((leaf, index) => (
        <span
          key={`${leaf.x}-${leaf.delay}-${index}`}
          className={styles.leaf}
          style={
            {
              "--leaf-delay": leaf.delay,
              "--leaf-drift": leaf.drift,
              "--leaf-duration": leaf.duration,
              "--leaf-fill": leaf.fill,
              "--leaf-opacity": leaf.opacity,
              "--leaf-rotate": leaf.rotate,
              "--leaf-size": leaf.size,
              "--leaf-x": leaf.x,
            } satisfies CSSProperties & LeafVars
          }
        />
      ))}
    </div>
  );
}
