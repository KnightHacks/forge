export interface AmbientVideoSource {
  media?: string;
  src: string;
  type: string;
}

/** Builds cross-browser WebM and HEVC-alpha sources for transparent video. */
export function getTransparentVideoSources(srcBase: string) {
  return [
    {
      src: `${srcBase}.mov`,
      type: 'video/quicktime; codecs="hvc1"',
    },
    {
      src: `${srcBase}.webm`,
      type: 'video/webm; codecs="vp9"',
    },
  ] satisfies AmbientVideoSource[];
}

/** Builds mobile and desktop transparent-video sources with media queries. */
export function getResponsiveTransparentVideoSources(srcBase: string) {
  return [
    ...getTransparentVideoSources(`${srcBase}-mobile`).map((source) => ({
      ...source,
      media: "(max-width: 760px)",
    })),
    ...getTransparentVideoSources(`${srcBase}-desktop`).map((source) => ({
      ...source,
      media: "(min-width: 761px)",
    })),
  ] satisfies AmbientVideoSource[];
}
