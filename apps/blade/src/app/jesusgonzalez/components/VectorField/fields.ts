import type { Vector2, Bounds, VectorFieldFn } from "./types";

export const swirlField: VectorFieldFn = (x, y) => ({
    x: -y,
    y: x
});

export function generateGridPoint(
    xMin: number,
    xMax: number,
    yMin: number,
    yMax: number,
    step: number,
): Vector2[] {
    const points: Vector2[] = [];
    for(let x = xMin; x <= xMax; x += step){
        for(let y = yMin; y <= yMax; y += step){
            points.push({x, y});
        }
    }
    return points;
}

export function mapToScreen(
    point: Vector2,
    bounds: Bounds,
    width: number,
    height: number,
) : Vector2 {
    const { xMin, xMax, yMin, yMax } = bounds;
    return {
        x: ((point.x - xMin) / (xMax - xMin)) * width,
        y: ((yMax - point.y) / (yMax - yMin)) * height
    };
}

export function screenToMath(
    screenX: number,
    screenY: number,
    bounds: Bounds,
    width: number,
    height: number,
): Vector2 {
    const { xMin, xMax, yMin, yMax } = bounds;
    return {
        x: xMin + (screenX / width) * (xMax - xMin),
        y: yMax - (screenY / height) * (yMax - yMin)
    };
}

export const radialField: VectorFieldFn = (x, y) => {
    const mag = Math.sqrt(x * x + y * y) || 1;
    return { x: x / mag, y: y / mag };
};

export const sinkField: VectorFieldFn = (x, y) => {
    const mag = Math.sqrt(x * x + y * y) || 1;
    return { x: -x / mag, y: -y / mag };
};

export const createMouseFollowField = (mouseX: number, mouseY: number): VectorFieldFn => {
    return (x, y) => {
        const dx = mouseX - x;
        const dy = mouseY - y;
        const mag = Math.sqrt(dx * dx + dy * dy) || 1;
        return { x: dx / mag, y: dy / mag };
    };
};