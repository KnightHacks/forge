"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@forge/ui";

import type {
  ApplicationVisualAmbientLayer,
  ApplicationVisualAssetCredit,
  ApplicationVisualLayer,
  ApplicationVisualMode,
  BackgroundSize,
} from "./hackbackgrounds/types";
import { AssetCredit } from "~/app/_components/assets";
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
const EMPTY_ASSET_CREDITS: readonly ApplicationVisualAssetCredit[] = [];

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

const APPLICATION_FALLING_LEAVES: readonly FallingLeaf[] = [
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

function getProgressWindow(progress: number, start: number, distance = 0.1) {
  return clampProgress((progress - start) / distance);
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

function shouldUseMobileTiming({
  maxWidth,
  viewport,
}: {
  maxWidth?: number;
  viewport: BackgroundSize | null;
}) {
  if (!isValidBackgroundSize(viewport)) return false;

  return viewport.width <= (maxWidth ?? 640);
}

function getAnimatedRestFrameIndex(layer: ApplicationVisualLayer) {
  const frameCount = layer.animatedFrameSrcs?.length ?? 0;
  if (frameCount <= 0) return 0;

  const requestedIndex = layer.animatedRestFrameIndex ?? frameCount - 1;

  if (!Number.isFinite(requestedIndex)) return frameCount - 1;

  return Math.min(Math.max(Math.round(requestedIndex), 0), frameCount - 1);
}

export function HackerApplicationBackground({
  backgroundKey,
  isTransitioning = false,
  progress,
  transitionMsOverride,
  transitionDirection = "forward",
}: {
  backgroundKey?: string | null;
  isTransitioning?: boolean;
  progress: number;
  transitionMsOverride?: number;
  transitionDirection?: StepDirection;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const visualConfig = getHackerApplicationBackground(backgroundKey);
  const layers = visualConfig.layers ?? EMPTY_VISUAL_LAYERS;
  const ambientLayers = visualConfig.ambientLayers ?? EMPTY_AMBIENT_LAYERS;
  const assetCredits = visualConfig.assetCredits ?? EMPTY_ASSET_CREDITS;
  const primaryLayer =
    layers.find((layer) => layer.id === visualConfig.baseLayerId) ??
    layers.find((layer) => (layer.space ?? "scene") === "scene") ??
    layers[0];
  const [layerState, setLayerState] = useState<LayerState>(() =>
    getFreshLayerState(visualConfig.key, layers),
  );
  const [viewportSize, setViewportSize] = useState<BackgroundSize | null>(null);
  const [animatedFrameIndexes, setAnimatedFrameIndexes] = useState<
    Record<string, number>
  >({});
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

  useEffect(() => {
    for (const layer of layers) {
      if (!layer.animatedFrameSrcs?.length) continue;

      for (const src of layer.animatedFrameSrcs) {
        const frame = new window.Image();
        frame.src = src;
      }
    }
  }, [layers]);

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
  const usesMobileTiming = shouldUseMobileTiming({
    maxWidth: visualConfig.mobileTimingMaxWidth,
    viewport: viewportSize,
  });
  const transitionMs = usesMobileTiming
    ? (visualConfig.mobileTransitionMs ?? visualConfig.transitionMs)
    : visualConfig.transitionMs;
  const resolvedTransitionMs = transitionMsOverride ?? transitionMs ?? 620;
  const transition = `${resolvedTransitionMs}ms ${visualConfig.transitionEasing ?? "cubic-bezier(0.22, 1, 0.36, 1)"}`;
  const showStockEffects =
    !canRenderCustomVisual || visualConfig.showStockEffects === true;
  const fallingLeavesProgress =
    visualConfig.fallingLeavesStartProgress === undefined
      ? 0
      : getProgressWindow(
          safeProgress,
          visualConfig.fallingLeavesStartProgress,
        );

  useEffect(() => {
    const animatedFrameLayers = layers.filter(
      (layer) => layer.animatedFrameSrcs?.length,
    );

    if (animatedFrameLayers.length === 0) return;

    let animationFrameId: number | null = null;

    const setLayerFrameIndexes = (
      getFrameIndex: (layer: ApplicationVisualLayer) => number,
    ) => {
      setAnimatedFrameIndexes((current) => {
        let next = current;

        for (const layer of animatedFrameLayers) {
          const frameCount = layer.animatedFrameSrcs?.length ?? 0;
          if (frameCount === 0) continue;

          const frameIndex =
            ((getFrameIndex(layer) % frameCount) + frameCount) % frameCount;

          if (current[layer.id] !== frameIndex) {
            next = next === current ? { ...current } : next;
            next[layer.id] = frameIndex;
          }
        }

        return next;
      });
    };

    if (!isTransitioning) {
      animationFrameId = window.requestAnimationFrame(() => {
        setLayerFrameIndexes(getAnimatedRestFrameIndex);
      });

      return () => {
        if (animationFrameId !== null) {
          window.cancelAnimationFrame(animationFrameId);
        }
      };
    }

    const startedAt = performance.now();
    const durationMs = Math.max(resolvedTransitionMs, 1);

    const updateFrame = (now: number) => {
      const transitionProgress = clampProgress((now - startedAt) / durationMs);

      setLayerFrameIndexes((layer) => {
        const restFrameIndex = getAnimatedRestFrameIndex(layer);
        return Math.min(
          restFrameIndex,
          Math.floor(transitionProgress * (restFrameIndex + 1)),
        );
      });

      if (transitionProgress < 1) {
        animationFrameId = window.requestAnimationFrame(updateFrame);
      }
    };

    animationFrameId = window.requestAnimationFrame(updateFrame);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isTransitioning, layers, resolvedTransitionMs]);

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
    const isPrimaryLayer = layer.id === primaryLayer?.id;
    const layerSrc = layer.idleSrc ?? layer.src;
    const layerMediaStyle = getLayerMediaStyle(layer);
    const shouldPaceTransition =
      isTransitioning && !!layer.motion?.transitionPaceClassName;
    const renderAnimatedLayerContainer = (children: ReactNode) => (
      <div
        className={cn(
          "relative h-full w-full",
          shouldPaceTransition && layer.motion?.transitionPaceClassName,
          shouldPaceTransition &&
            (transitionDirection === "back"
              ? "kh-application-transition-back"
              : "kh-application-transition-forward"),
        )}
        style={
          shouldPaceTransition
            ? ({
                "--kh-application-transition-duration": `${resolvedTransitionMs}ms`,
                "--kh-application-transition-stride-duration": `${layer.motion?.transitionStrideMs ?? 620}ms`,
              } as CSSProperties)
            : undefined
        }
      >
        <div
          className={cn(
            "relative h-full w-full",
            shouldPaceTransition && layer.motion?.transitionStrideClassName,
          )}
        >
          {children}
        </div>
      </div>
    );
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

    if (layer.animatedFrameSrcs?.length) {
      const restFrameIndex = getAnimatedRestFrameIndex(layer);
      const frameIndex =
        (animatedFrameIndexes[layer.id] ?? restFrameIndex) %
        layer.animatedFrameSrcs.length;
      const frameSrc = layer.animatedFrameSrcs[frameIndex] ?? layerSrc;

      return renderAnimatedLayerContainer(
        // eslint-disable-next-line @next/next/no-img-element -- Supports arbitrary R2/local image URLs while retaining the last animation frame when paused.
        <img
          alt={layer.alt ?? ""}
          className={cn(
            "h-full w-full max-w-none select-none",
            layer.mediaClassName,
          )}
          decoding="async"
          fetchPriority={isPrimaryLayer ? "high" : "auto"}
          loading={isPrimaryLayer ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
          src={frameSrc}
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
        />,
      );
    }

    if (layer.animatedSrc) {
      const renderAnimatedImage = ({
        isVisible,
        loading,
        src,
      }: {
        isVisible: boolean;
        loading: "eager" | "lazy";
        src: string;
      }) => (
        // eslint-disable-next-line @next/next/no-img-element -- Supports arbitrary R2 image URLs while keeping animated layers mounted for smooth playback.
        <img
          alt={layer.alt ?? ""}
          className={cn(
            "absolute inset-0 h-full w-full max-w-none select-none",
            layer.mediaClassName,
          )}
          decoding="async"
          fetchPriority={isPrimaryLayer ? "high" : "auto"}
          loading={loading}
          referrerPolicy="no-referrer"
          src={src}
          style={{
            ...layerMediaStyle,
            opacity: isVisible ? 1 : 0,
            visibility: isVisible ? "visible" : "hidden",
          }}
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

      return renderAnimatedLayerContainer(
        <>
          {renderAnimatedImage({
            isVisible: !isTransitioning,
            loading: isPrimaryLayer ? "eager" : "lazy",
            src: layerSrc,
          })}
          {renderAnimatedImage({
            isVisible: isTransitioning,
            loading: "eager",
            src: layer.animatedSrc,
          })}
        </>,
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
        fetchPriority={isPrimaryLayer ? "high" : "auto"}
        loading={isPrimaryLayer ? "eager" : "lazy"}
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
          <source
            key={source.src}
            media={source.media}
            srcSet={source.src}
            type={source.mimeType}
          />
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
        data-application-layer={layer.id}
        style={{
          height: frame?.height ?? "100%",
          opacity: layer.opacity,
          transform: `translate3d(${(translateX * parallax).toFixed(2)}px, -50%, 0)`,
          transition: `transform ${transition}`,
          width: frame?.width ?? "100%",
          willChange: isTransitioning ? "transform" : undefined,
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
      data-application-layer={layer.id}
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
        data-application-ambient-layer={layer.id}
        style={{
          height: frame?.height ?? "100%",
          transform: `translate3d(${(translateX * parallax).toFixed(2)}px, -50%, 0)`,
          transition: `transform ${transition}`,
          width: frame?.width ?? "100%",
          willChange: isTransitioning ? "transform" : undefined,
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
      data-application-ambient-layer={layer.id}
      style={{
        zIndex: layer.zIndex ?? 0,
        ...layer.style,
      }}
    />
  );

  const renderSceneFallingLeaves = () => {
    if (visualConfig.fallingLeavesStartProgress === undefined) return null;

    return (
      <div
        className="absolute left-0 top-1/2"
        style={{
          height: frame?.height ?? "100%",
          transform: `translate3d(${translateX.toFixed(2)}px, -50%, 0)`,
          transition: `transform ${transition}`,
          width: frame?.width ?? "100%",
          willChange: isTransitioning ? "transform" : undefined,
          zIndex: 3,
        }}
      >
        <div
          aria-hidden="true"
          className="khix-application-leaf-field"
          style={
            {
              "--khix-application-leaf-field-opacity":
                fallingLeavesProgress.toFixed(3),
            } as CSSProperties
          }
        >
          {APPLICATION_FALLING_LEAVES.map((leaf, index) => (
            <span
              key={`${leaf.x}-${leaf.delay}-${index}`}
              className="khix-application-leaf"
              style={
                {
                  "--khix-application-leaf-delay": leaf.delay,
                  "--khix-application-leaf-drift": leaf.drift,
                  "--khix-application-leaf-duration": leaf.duration,
                  "--khix-application-leaf-fill": leaf.fill,
                  "--khix-application-leaf-opacity": leaf.opacity,
                  "--khix-application-leaf-rotate": leaf.rotate,
                  "--khix-application-leaf-size": leaf.size,
                  "--khix-application-leaf-x": leaf.x,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
    );
  };

  const renderAssetCredit = (assetCredit: ApplicationVisualAssetCredit) => (
    <AssetCredit
      key={assetCredit.id}
      className={assetCredit.className}
      credits={assetCredit.credits}
      label={assetCredit.label}
    >
      <span className="khix-application-asset-credit-target" />
    </AssetCredit>
  );

  return (
    <>
      {canRenderCustomVisual && (
        <div
          ref={viewportRef}
          aria-hidden="true"
          className="kh-application-background-scene pointer-events-none absolute inset-0 z-0 overflow-hidden"
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
          {renderSceneFallingLeaves()}
          <div
            className={cn(
              "absolute inset-0 z-10",
              visualConfig.overlayClassName,
            )}
          />
        </div>
      )}

      {canRenderCustomVisual && assetCredits.length > 0 ? (
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
          {assetCredits.map(renderAssetCredit)}
        </div>
      ) : null}

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
