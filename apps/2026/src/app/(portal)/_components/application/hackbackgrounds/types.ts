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
  transitionPaceClassName?: string;
  transitionStrideClassName?: string;
  transitionStrideMs?: number;
  turnDurationMs?: number;
}

export interface ApplicationVisualAssetCreditEntry {
  name: string;
  href?: string;
  newTab?: boolean;
}

export interface ApplicationVisualAssetCredit {
  id: string;
  className?: string;
  credits: readonly ApplicationVisualAssetCreditEntry[];
  label?: string;
}

export interface ApplicationVisualLayer {
  id: string;
  kind: ApplicationVisualLayerKind;
  src: string;
  alt?: string;
  animatedRestFrameIndex?: number;
  animatedFrameSrcs?: readonly string[];
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
  assetCredits?: readonly ApplicationVisualAssetCredit[];
  baseLayerId?: string;
  fallingLeavesStartProgress?: number;
  layers?: readonly ApplicationVisualLayer[];
  mobileQuestionTransitionMs?: number;
  mobileStepTransitionMs?: number;
  mobileTimingMaxWidth?: number;
  mobileTransitionMs?: number;
  mode: ApplicationVisualMode;
  overlayClassName?: string;
  questionTransitionMs?: number;
  showStockEffects?: boolean;
  stepTransitionMs?: number;
  transitionEasing?: string;
  styles?: string;
  transitionMs?: number;
}
