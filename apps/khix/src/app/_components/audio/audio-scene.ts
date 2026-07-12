/**
 * Declarative configuration for the site's layered ambience.
 *
 * Every layer is a looping track that plays continuously; what changes as you
 * scroll is each layer's *volume*. A zone maps a page section (by CSS selector)
 * to a target volume for every layer, and the controller crossfades toward the
 * volumes of whichever zone currently dominates the viewport. Sections without
 * an explicit zone fall back to `DEFAULT_ZONE_VOLUMES`.
 *
 * Tune the numbers below freely — they are just target gains in the 0–1 range.
 */

export interface AudioLayerConfig {
  id: string;
  /** Swap for the CDN URL (assets.knighthacks.org/khix/...) once uploaded. */
  src: string;
}

export const AUDIO_LAYERS = [
  { id: "birds", src: "/audio/birds.mp3" },
  { id: "stream", src: "/audio/stream.mp3" },
  { id: "cave", src: "/audio/cave.mp3" },
] as const satisfies readonly AudioLayerConfig[];

export type AudioLayerId = (typeof AUDIO_LAYERS)[number]["id"];

export type LayerVolumes = Record<AudioLayerId, number>;

/** The layer to watch for real playback state (drives the button's UI). */
export const PRIMARY_LAYER_ID: AudioLayerId = "birds";

/**
 * Volumes for the forest/default areas (hero, about, tracks, sponsors, team) —
 * anywhere no special zone is in view.
 */
export const DEFAULT_ZONE_VOLUMES: LayerVolumes = {
  birds: 0.5,
  stream: 0,
  cave: 0,
};

export interface AudioZone {
  id: string;
  /** Element whose viewport overlap decides whether this zone is active. */
  selector: string;
  volumes: LayerVolumes;
  /**
   * Tie-breaker when several zones are on screen at once. Higher wins even with
   * less coverage. Needed because the tall cave section overlaps the short
   * waterfall separator — without this the cave would swallow the waterfall
   * moment. Defaults to 0.
   */
  priority?: number;
}

export const AUDIO_ZONES: readonly AudioZone[] = [
  // Pond by the speakers: birds soften, water comes in.
  {
    id: "pond",
    selector: "#speakers",
    volumes: { birds: 0.3, stream: 0.4, cave: 0 },
  },
  // The waterfall separator above the FAQ: stream swells, birds mostly gone.
  // Prioritized so it wins while visible, then hands off to the cave below.
  {
    id: "waterfall",
    selector: "#faq",
    volumes: { birds: 0.15, stream: 0.6, cave: 0 },
    priority: 1,
  },
  // The FAQ cave: birds fully muted, faint stream, cave ambience fills in.
  {
    id: "cave",
    selector: "[data-audio-zone='cave']",
    volumes: { birds: 0, stream: 0.1, cave: 0.4 },
  },
];

/**
 * A zone must cover at least this fraction of the viewport height to become
 * active; otherwise the default (forest) volumes apply.
 */
export const MIN_ZONE_OVERLAP = 0.2;

/**
 * Crossfade time constant in seconds. Larger = slower, gentler transitions
 * between zones.
 */
export const CROSSFADE_TAU = 0.5;
