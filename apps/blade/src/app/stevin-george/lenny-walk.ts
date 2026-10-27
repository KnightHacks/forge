// Movement and frame timing from the earlier forest portfolio's walk.ts.
// Only the stage and display dimensions change for this one-page layout.
export const WORLD = { width: 1296, height: 452, ground: 420 };
export const PLAYER = { width: 112, height: 145 };

export interface Walker {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: number;
  phase: number;
}

export interface Terrain {
  maxX: number;
  support: (x: number) => number | undefined;
}

const FOREST: Terrain = {
  maxX: WORLD.width - PLAYER.width / 2,
  support: () => 0,
};

export function createWalker(x = 785): Walker {
  return { x, y: 0, vx: 0, vy: 0, grounded: true, facing: 1, phase: 9 };
}

export function stepWalker(
  current: Walker,
  direction: number,
  jump: boolean,
  dt: number,
  terrain: Terrain = FOREST,
): Walker {
  const next = { ...current };
  const response = 1 - Math.exp(-dt / (direction ? 0.11 : 0.13));
  next.vx += (direction * 400 - next.vx) * response;
  if (!direction && Math.abs(next.vx) < 1) next.vx = 0;
  if (Math.abs(next.vx) > 1) next.facing = Math.sign(next.vx);
  if (jump && next.grounded) {
    next.vy = 750;
    next.grounded = false;
  }

  next.x = Math.max(
    PLAYER.width / 2,
    Math.min(terrain.maxX, current.x + next.vx * dt),
  );
  next.y = current.y + next.vy * dt - 950 * dt * dt;
  next.vy -= 1900 * dt;
  const support = terrain.support(next.x);
  // Follow slopes while walking; airborne feet only land when crossing from above.
  next.grounded =
    support !== undefined &&
    ((current.grounded && !jump) ||
      (next.vy <= 0 && current.y >= support && next.y <= support));
  if (next.grounded) {
    next.y = support ?? 0;
    next.vy = 0;
  }
  // Distance, rather than time or key presses, drives the original walk cycle.
  if (current.grounded && next.grounded) {
    next.phase = (current.phase + Math.abs(next.x - current.x) / 34) % 16;
  }
  return next;
}
