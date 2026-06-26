import type { CSSProperties } from "react";

export type ApplicationVisualMode = "static" | "dynamic";
export type ApplicationVisualLayerKind = "image" | "video";
export type ApplicationVisualLayerSpace = "scene" | "viewport";

export interface BackgroundSize {
  height: number;
  width: number;
}

export interface ApplicationVisualLayerSource {
  media?: string;
  mimeType?: string;
  src: string;
}

export interface ApplicationVisualLayerMotion {
  facesStepDirection?: boolean;
  turnDurationMs?: number;
}

export interface ApplicationVisualLayer {
  id: string;
  kind: ApplicationVisualLayerKind;
  src: string;
  alt?: string;
  animatedSrc?: string;
  className?: string;
  idleSrc?: string;
  mediaClassName?: string;
  mediaStyle?: CSSProperties;
  mimeType?: string;
  motion?: ApplicationVisualLayerMotion;
  nativeSize?: BackgroundSize;
  opacity?: number;
  parallax?: number;
  playbackRate?: number;
  preload?: "auto" | "metadata" | "none";
  sources?: readonly ApplicationVisualLayerSource[];
  space?: ApplicationVisualLayerSpace;
  style?: CSSProperties;
  zIndex?: number;
}

export interface ApplicationVisualAmbientLayer {
  id: string;
  className: string;
  parallax?: number;
  space?: ApplicationVisualLayerSpace;
  style?: CSSProperties;
  zIndex?: number;
}

export interface ApplicationVisualConfig {
  key: string;
  label: string;
  ambientLayers?: readonly ApplicationVisualAmbientLayer[];
  baseLayerId?: string;
  layers?: readonly ApplicationVisualLayer[];
  mode: ApplicationVisualMode;
  overlayClassName?: string;
  questionTransitionMs?: number;
  showStockEffects?: boolean;
  stepTransitionMs?: number;
  styles?: string;
  transitionMs?: number;
}
