"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@forge/ui";

import type {
  ApplicationVisualAmbientLayer,
  ApplicationVisualLayer,
  ApplicationVisualMode,
  BackgroundSize,
} from "./hackbackgrounds/types";
import { getHackerApplicationBackground } from "./hackbackgrounds";

type StepDirection = "forward" | "back";

interface BackgroundFrame {
  endX: number;
  height: number;
  startX: number;
  width: number;
}

interface LayerState {
  failedLayerIds: Set<string>;
  layerSizes: Record<string, BackgroundSize>;
  visualKey: string;
}

const EMPTY_VISUAL_LAYERS: readonly ApplicationVisualLayer[] = [];
const EMPTY_AMBIENT_LAYERS: readonly ApplicationVisualAmbientLayer[] = [];

function isValidBackgroundSize(
  size: BackgroundSize | null | undefined,
): size is BackgroundSize {
  return (
    !!size &&
    Number.isFinite(size.width) &&
    Number.isFinite(size.height) &&
    size.width > 0 &&
    size.height > 0
  );
}

function getCoverBackgroundFrame({
  image,
  viewport,
}: {
  image: BackgroundSize;
  viewport: BackgroundSize;
}): BackgroundFrame {
  const coverScale = Math.max(
    viewport.width / image.width,
    viewport.height / image.height,
  );
  const width = image.width * coverScale;
  const height = image.height * coverScale;
  const endX = Math.min(0, viewport.width - width);

  return {
    endX,
    height,
    startX: 0,
    width,
  };
}

function getInitialLayerSizes(layers: readonly ApplicationVisualLayer[]) {
  const sizes: Record<string, BackgroundSize> = {};

  for (const layer of layers) {
    if (layer.nativeSize) {
      sizes[layer.id] = layer.nativeSize;
    }
  }

  return sizes;
}

function getFreshLayerState(
  visualKey: string,
  layers: readonly ApplicationVisualLayer[],
): LayerState {
  return {
    failedLayerIds: new Set(),
    layerSizes: getInitialLayerSizes(layers),
    visualKey,
  };
}

function clampProgress(progress: number) {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(Math.max(progress, 0), 1);
}

function getFrameTranslateX({
  frame,
  mode,
  progress,
}: {
  frame: BackgroundFrame;
  mode: ApplicationVisualMode;
  progress: number;
}) {
  if (mode === "static") {
    return frame.endX / 2;
  }

  return frame.startX + (frame.endX - frame.startX) * progress;
}

export function HackerApplicationBackground({
  backgroundKey,
  isTransitioning = false,
  progress,
  transitionDirection = "forward",
}: {
  backgroundKey?: string | null;
  isTransitioning?: boolean;
  progress: number;
  transitionDirection?: StepDirection;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const visualConfig = getHackerApplicationBackground(backgroundKey);
  const layers = visualConfig.layers ?? EMPTY_VISUAL_LAYERS;
  const ambientLayers = visualConfig.ambientLayers ?? EMPTY_AMBIENT_LAYERS;
  const primaryLayer =
    layers.find((layer) => layer.id === visualConfig.baseLayerId) ??
    layers.find((layer) => (layer.space ?? "scene") === "scene") ??
    layers[0];
  const [layerState, setLayerState] = useState<LayerState>(() =>
    getFreshLayerState(visualConfig.key, layers),
  );
  const [viewportSize, setViewportSize] = useState<BackgroundSize | null>(null);
  const activeLayerState =
    layerState.visualKey === visualConfig.key
      ? layerState
      : getFreshLayerState(visualConfig.key, layers);
  const { failedLayerIds, layerSizes } = activeLayerState;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateViewportSize = () => {
      const rect = viewport.getBoundingClientRect();
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight;

      setViewportSize({
        height,
        width,
      });
    };

    updateViewportSize();

    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(viewport);
    window.addEventListener("resize", updateViewportSize);
    window.visualViewport?.addEventListener("resize", updateViewportSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateViewportSize);
      window.visualViewport?.removeEventListener("resize", updateViewportSize);
    };
  }, [visualConfig.key]);

  const primaryLayerFailed =
    !!primaryLayer && failedLayerIds.has(primaryLayer.id);
  const hasCustomVisual = layers.length > 0 && !!primaryLayer;
  const canRenderCustomVisual = hasCustomVisual && !primaryLayerFailed;
  const primaryLayerSize = primaryLayer
    ? (layerSizes[primaryLayer.id] ?? primaryLayer.nativeSize)
    : null;
  const frame =
    isValidBackgroundSize(primaryLayerSize) &&
    isValidBackgroundSize(viewportSize)
      ? getCoverBackgroundFrame({
          image: primaryLayerSize,
          viewport: viewportSize,
        })
      : null;
  const safeProgress = clampProgress(progress);
  const translateX = frame
    ? getFrameTranslateX({
        frame,
        mode: visualConfig.mode,
        progress: safeProgress,
      })
    : 0;
  const transition = `${visualConfig.transitionMs ?? 620}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  const showStockEffects =
    !canRenderCustomVisual || visualConfig.showStockEffects === true;

  const setLayerSize = (layerId: string, size: BackgroundSize) => {
    setLayerState((current) => {
      const baseState =
        current.visualKey === visualConfig.key
          ? current
          : getFreshLayerState(visualConfig.key, layers);

      return {
        ...baseState,
        layerSizes: {
          ...baseState.layerSizes,
          [layerId]: size,
        },
      };
    });
  };

  const markLayerFailed = (layerId: string) => {
    setLayerState((current) => {
      const baseState =
        current.visualKey === visualConfig.key
          ? current
          : getFreshLayerState(visualConfig.key, layers);

      if (baseState.failedLayerIds.has(layerId)) return current;

      const failedLayerIds = new Set(baseState.failedLayerIds);
      failedLayerIds.add(layerId);
      return {
        ...baseState,
        failedLayerIds,
      };
    });
  };

  const getLayerMediaStyle = (layer: ApplicationVisualLayer) => {
    const shouldFaceBackward =
      isTransitioning &&
      transitionDirection === "back" &&
      layer.motion?.facesStepDirection === true;
    const turnDurationMs = layer.motion?.turnDurationMs ?? 220;
    const transform = [
      layer.mediaStyle?.transform,
      shouldFaceBackward ? "scaleX(-1)" : "scaleX(1)",
    ]
      .filter(Boolean)
      .join(" ");
    const transition = [
      layer.mediaStyle?.transition,
      `transform ${turnDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    ]
      .filter(Boolean)
      .join(", ");

    return {
      ...layer.mediaStyle,
      ...(layer.motion?.facesStepDirection
        ? {
            transform,
            transition,
            willChange: "transform",
          }
        : {}),
    };
  };

  const renderLayerMedia = (layer: ApplicationVisualLayer) => {
    const layerSrc =
      isTransitioning && layer.animatedSrc
        ? layer.animatedSrc
        : (layer.idleSrc ?? layer.src);
    const layerMediaStyle = getLayerMediaStyle(layer);
    const layerSources =
      layerSrc === layer.src && layer.sources
        ? layer.sources
        : [{ mimeType: layer.mimeType, src: layerSrc }];

    if (layer.kind === "video") {
      return (
        <video
          key={layerSrc}
          aria-hidden="true"
          autoPlay
          className={cn("h-full w-full object-contain", layer.mediaClassName)}
          loop
          muted
          playsInline
          preload={layer.preload ?? "metadata"}
          style={layerMediaStyle}
          onCanPlay={(event) => {
            if (layer.playbackRate) {
              event.currentTarget.playbackRate = layer.playbackRate;
            }

            void event.currentTarget.play().catch(() => {
              markLayerFailed(layer.id);
            });
          }}
          onError={() => {
            markLayerFailed(layer.id);
          }}
          onLoadedMetadata={(event) => {
            if (
              event.currentTarget.videoWidth <= 0 ||
              event.currentTarget.videoHeight <= 0
            ) {
              return;
            }

            setLayerSize(layer.id, {
              height: event.currentTarget.videoHeight,
              width: event.currentTarget.videoWidth,
            });
          }}
        >
          {layerSources.map((source) => (
            <source key={source.src} src={source.src} type={source.mimeType} />
          ))}
        </video>
      );
    }

    const imageElement = (
      // eslint-disable-next-line @next/next/no-img-element -- Supports arbitrary R2 image URLs while reading natural dimensions for pan math.
      <img
        alt={layer.alt ?? ""}
        className={cn(
          "h-full w-full max-w-none select-none",
          layer.mediaClassName,
        )}
        decoding="async"
        referrerPolicy="no-referrer"
        src={layerSrc}
        style={layerMediaStyle}
        onError={() => {
          markLayerFailed(layer.id);
        }}
        onLoad={(event) => {
          if (
            event.currentTarget.naturalWidth <= 0 ||
            event.currentTarget.naturalHeight <= 0
          ) {
            return;
          }

          setLayerSize(layer.id, {
            height: event.currentTarget.naturalHeight,
            width: event.currentTarget.naturalWidth,
          });
        }}
      />
    );

    if (!layer.sources?.length || layerSrc !== layer.src) {
      return imageElement;
    }

    return (
      <picture key={layerSrc} className="block h-full w-full">
        {layer.sources.map((source) => (
          <source key={source.src} srcSet={source.src} type={source.mimeType} />
        ))}
        {imageElement}
      </picture>
    );
  };

  const renderSceneLayer = (layer: ApplicationVisualLayer) => {
    const parallax = layer.parallax ?? 1;

    return (
      <div
        key={layer.id}
        className={cn("absolute left-0 top-1/2", layer.className)}
        style={{
          height: frame?.height ?? "100%",
          opacity: layer.opacity,
          transform: `translate3d(${(translateX * parallax).toFixed(2)}px, -50%, 0)`,
          transition: `transform ${transition}`,
          width: frame?.width ?? "100%",
          willChange: "transform",
          zIndex: layer.zIndex ?? 0,
          ...layer.style,
        }}
      >
        {renderLayerMedia(layer)}
      </div>
    );
  };

  const renderViewportLayer = (layer: ApplicationVisualLayer) => (
    <div
      key={layer.id}
      className={cn("absolute", layer.className)}
      style={{
        opacity: layer.opacity,
        zIndex: layer.zIndex ?? 0,
        ...layer.style,
      }}
    >
      {renderLayerMedia(layer)}
    </div>
  );

  const renderSceneAmbientLayer = (layer: ApplicationVisualAmbientLayer) => {
    const parallax = layer.parallax ?? 1;

    return (
      <div
        key={layer.id}
        className={cn("absolute left-0 top-1/2", layer.className)}
        style={{
          height: frame?.height ?? "100%",
          transform: `translate3d(${(translateX * parallax).toFixed(2)}px, -50%, 0)`,
          transition: `transform ${transition}`,
          width: frame?.width ?? "100%",
          willChange: "transform",
          zIndex: layer.zIndex ?? 0,
          ...layer.style,
        }}
      />
    );
  };

  const renderViewportAmbientLayer = (layer: ApplicationVisualAmbientLayer) => (
    <div
      key={layer.id}
      className={cn("absolute inset-0", layer.className)}
      style={{
        zIndex: layer.zIndex ?? 0,
        ...layer.style,
      }}
    />
  );

  return (
    <>
      {canRenderCustomVisual && (
        <div
          ref={viewportRef}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        >
          {layers
            .filter((layer) => !failedLayerIds.has(layer.id))
            .map((layer) =>
              (layer.space ?? "scene") === "viewport"
                ? renderViewportLayer(layer)
                : renderSceneLayer(layer),
            )}
          {ambientLayers.map((layer) =>
            (layer.space ?? "viewport") === "scene"
              ? renderSceneAmbientLayer(layer)
              : renderViewportAmbientLayer(layer),
          )}
          <div
            className={cn(
              "absolute inset-0 z-10",
              visualConfig.overlayClassName,
            )}
          />
        </div>
      )}

      {showStockEffects && (
        <>
          <div
            className="kh-application-sweep pointer-events-none absolute inset-y-0 -left-1/2 z-0 w-full"
            aria-hidden="true"
          />
          <div
            className="kh-application-grid pointer-events-none absolute inset-0 z-0 opacity-25"
            aria-hidden="true"
          />
        </>
      )}
    </>
  );
}
