'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Bounds, VectorFieldFn, Vector2 } from './types';
import {
    generateGridPoint,
    mapToScreen,
    screenToMath,
    sinkField,
    createMouseFollowField,
} from './fields';

interface InteractiveVectorFieldProps {
    height?: number;
    bounds?: Bounds;
    step?: number;
    arrowScale?: number;
    color?: string;
}

const lerpAngle = (current: number, target: number, t: number): number => {
    let diff = target - current;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return current + diff * t;
};

const drawArrow = (
    ctx: CanvasRenderingContext2D,
    start: Vector2,
    vector: Vector2,
    scale: number,
    color: string
) => {
    const end = {
        x: start.x + vector.x * scale,
        y: start.y - vector.y * scale,
    };

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    const headLength = 4;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
        end.x - headLength * Math.cos(angle - Math.PI / 6),
        end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        end.x - headLength * Math.cos(angle + Math.PI / 6),
        end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
};

const BORDER_PADDING = 20;

const InteractiveVectorField = ({
    height = 250,
    bounds = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
    step = 0.8,
    arrowScale = 12,
    color = '#a78bfa',
}: InteractiveVectorFieldProps) => {
    const [mousePos, setMousePos] = useState<Vector2 | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height });
    const totalHeight = height + BORDER_PADDING * 2;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>(0);
    const currentAnglesRef = useRef<Map<string, number>>(new Map());

    const getField = useCallback((): VectorFieldFn => {
        if (mousePos) {
            return createMouseFollowField(mousePos.x, mousePos.y);
        }
        return sinkField;
    }, [mousePos]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const width = entry.contentRect.width;
            setDimensions({ width, height });
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [height]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = dimensions.width * dpr;
        canvas.height = totalHeight * dpr;
        ctx.scale(dpr, dpr);

        const points = generateGridPoint(
            bounds.xMin,
            bounds.xMax,
            bounds.yMin,
            bounds.yMax,
            step
        );

        const lerpSpeed = 0.04;

        const render = () => {
            ctx.clearRect(0, 0, dimensions.width, totalHeight);

            // Draw dashed border lines at outer edges
            ctx.setLineDash([8, 6]);
            ctx.strokeStyle = '#4b5563';
            ctx.lineWidth = 1;

            // Top border
            ctx.beginPath();
            ctx.moveTo(0, 0.5);
            ctx.lineTo(dimensions.width, 0.5);
            ctx.stroke();

            // Bottom border
            ctx.beginPath();
            ctx.moveTo(0, totalHeight - 0.5);
            ctx.lineTo(dimensions.width, totalHeight - 0.5);
            ctx.stroke();

            ctx.setLineDash([]);

            const field = getField();

            points.forEach((point) => {
                const key = `${point.x},${point.y}`;
                const screenPos = mapToScreen(point, bounds, dimensions.width, height);
                // Offset Y position for border padding
                screenPos.y += BORDER_PADDING;
                const vector = field(point.x, point.y);

                const mag = Math.sqrt(vector.x ** 2 + vector.y ** 2) || 1;
                const normalized = { x: vector.x / mag, y: vector.y / mag };

                // Calculate target angle (in screen coordinates, y is flipped)
                const targetAngle = Math.atan2(-normalized.y, normalized.x);

                // Get or initialize current angle
                let currentAngle = currentAnglesRef.current.get(key);
                if (currentAngle === undefined) {
                    currentAngle = targetAngle;
                }

                // Lerp toward target
                currentAngle = lerpAngle(currentAngle, targetAngle, lerpSpeed);
                currentAnglesRef.current.set(key, currentAngle);

                // Convert back to vector
                const smoothedVector = {
                    x: Math.cos(currentAngle),
                    y: -Math.sin(currentAngle),
                };

                drawArrow(ctx, screenPos, smoothedVector, arrowScale, color);
            });

            animationRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationRef.current);
        };
    }, [dimensions, bounds, step, arrowScale, color, getField, height, totalHeight]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top - BORDER_PADDING;

        const mathPos = screenToMath(screenX, screenY, bounds, dimensions.width, height);
        setMousePos(mathPos);
    };

    const handleMouseLeave = () => {
        setMousePos(null);
    };

    return (
        <div ref={containerRef} className="w-full">
            <canvas
                ref={canvasRef}
                style={{ width: dimensions.width, height: totalHeight }}
                className="cursor-none"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            />
        </div>
    );
};

export default InteractiveVectorField;
