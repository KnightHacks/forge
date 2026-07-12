/**
 * Global mute state for the whole site. This is intentionally a tiny external
 * store (not React context) so that non-React code — like the FAQ's Web Audio
 * `playCaveNote` synth — can read it synchronously to decide whether to make a
 * sound. The floating mute button is the single control that toggles it, and
 * everything that produces audio (background song + sound effects) reads it.
 *
 * The preference is persisted to localStorage so a returning visitor keeps
 * their choice. The initial server/client render is always unmuted; the saved
 * value is applied after mount via `hydrateMutedFromStorage` to avoid a
 * hydration mismatch.
 */

const STORAGE_KEY = "khix:sound-muted";

type Listener = () => void;

const listeners = new Set<Listener>();
let muted = false;

export function isMuted() {
  return muted;
}

export function setMuted(next: boolean) {
  if (next === muted) {
    return;
  }

  muted = next;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Ignore storage failures (private mode, disabled storage, etc.).
    }
  }

  listeners.forEach((listener) => listener());
}

export function toggleMuted() {
  setMuted(!muted);
}

export function subscribeMuted(listener: Listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Apply any saved preference. Call once on the client after mount so the first
 * render still matches the server (unmuted) and only then adopts the stored value.
 */
export function hydrateMutedFromStorage() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored !== null) {
      setMuted(stored === "1");
    }
  } catch {
    // Ignore storage failures.
  }
}
