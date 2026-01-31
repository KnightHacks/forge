import React from 'react';
import type { Bounds, VectorFieldFn } from './types';
import { generateGridPoint, mapToScreen } from './fields';
import Arrow from './Arrow';

interface VectorFieldProps {
    field: VectorFieldFn,
    width?: number,
    height?: number,
    bounds?: Bounds,
    step?: number,
    arrowScale?: number,
    color?: string
};

const VectorField = ({
    field,
    width = 400,
    height = 400,
    bounds = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
    step = 1,
    arrowScale = 15,
    color = '#8b5cf6'
}: VectorFieldProps) => {
    const points = generateGridPoint(
        bounds.xMin,
        bounds.xMax,
        bounds.yMin,
        bounds.yMax,
        step
    );

  return (
    <svg width={width} height={height} className="bg-slate-900 rounded-lg">
        {points.map((point, i) => {
          const screenPos = mapToScreen(point, bounds, width, height)
          const vector = field(point.x, point.y)

          const mag = Math.sqrt(vector.x ** 2 + vector.y ** 2) || 1
          const normalized = { x: vector.x / mag, y: vector.y / mag }

          return (
            <Arrow
              key={i}
              start={screenPos}
              vector={normalized}
              scale={arrowScale}
              color={color}
            />
          )
        })}
    </svg>
  );
}



export default VectorField;
