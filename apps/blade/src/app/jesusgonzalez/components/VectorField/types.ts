export interface Vector2 {
    x: number,
    y: number
};

export interface Bounds {
    xMin: number,
    xMax: number,
    yMin: number,
    yMax: number
};

export type VectorFieldFn = (x: number, y: number) => Vector2;

export type FieldMode = 'mouse' | 'swirl' | 'radial' | 'sink';