import type { CSSProperties } from "react";

export type ApplicationVisualMode = "static" | "dynamic";
export type ApplicationVisualLayerKind = "image" | "video";
export type ApplicationVisualLayerSpace = "scene" | "viewport";

export interface BackgroundSize {
  height: number;
  width: number;
}

export interface ApplicationVisualLayerSource {
  mimeType?: string;
  src: string;
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

export interface ApplicationVisualConfig {
  key: string;
  label: string;
  baseLayerId?: string;
  layers?: readonly ApplicationVisualLayer[];
  mode: ApplicationVisualMode;
  overlayClassName?: string;
  questionTransitionMs?: number;
  showStockEffects?: boolean;
  stepTransitionMs?: number;
  transitionMs?: number;
}
