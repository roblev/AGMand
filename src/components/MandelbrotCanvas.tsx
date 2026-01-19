import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Viewport } from '../utils/mandelbrot';

interface MandelbrotCanvasProps {
    viewport: Viewport;
    maxIterations: number;
    onZoom: (pixelX: number, pixelY: number, zoomFactor: number) => void;
    onPan: (deltaPixelX: number, deltaPixelY: number) => void;
    onMouseDownPoint?: (pixelX: number, pixelY: number) => void;
    onMouseMovePoint?: (pixelX: number, pixelY: number) => void;
    onMouseUpPoint?: () => void;
    customCursor?: string;
}

const MandelbrotCanvas: React.FC<MandelbrotCanvasProps> = React.memo(({
    viewport,
    maxIterations,
    onZoom,
    onPan,
    onMouseDownPoint,
    onMouseMovePoint,
    onMouseUpPoint,
    customCursor,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const [isRendering, setIsRendering] = useState(false);
    const renderIdRef = useRef(0);

    // Use STATE for dragging so that changing it re-runs the wheel listener effect
    // This causes the listener to be removed and re-added, clearing any queued events
    const [isDragging, setIsDragging] = useState(false);
    const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

    // Store onZoom in a ref to avoid recreating the wheel handler
    const onZoomRef = useRef(onZoom);
    onZoomRef.current = onZoom;

    // Initialize Web Worker
    useEffect(() => {
        workerRef.current = new Worker(
            new URL('../workers/mandelbrot.worker.ts', import.meta.url),
            { type: 'module' }
        );

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        const worker = workerRef.current;
        if (!canvas || !worker) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const currentRenderId = ++renderIdRef.current;
        setIsRendering(true);

        const handleMessage = (e: MessageEvent) => {
            if (currentRenderId !== renderIdRef.current) return;

            const { imageData } = e.data;
            const data = new Uint8ClampedArray(imageData);
            const imgData = new ImageData(data, viewport.width, viewport.height);

            ctx.putImageData(imgData, 0, 0);
            setIsRendering(false);

            worker.removeEventListener('message', handleMessage);
        };

        worker.addEventListener('message', handleMessage);

        worker.postMessage({
            width: viewport.width,
            height: viewport.height,
            centerX: viewport.centerX,
            centerY: viewport.centerY,
            zoom: viewport.zoom,
            maxIterations: maxIterations,
        });
    }, [viewport, maxIterations]);

    useEffect(() => {
        const timer = setTimeout(() => {
            render();
        }, 50);
        return () => clearTimeout(timer);
    }, [render]);

    // Wheel event listener - depends on isDragging state
    // When isDragging changes, this effect runs again, removing the old listener
    // and adding a new one (or not adding one if dragging)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Don't add wheel listener when dragging - this prevents any queued events from firing
        if (isDragging) {
            return;
        }

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const rect = canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;

            // Normalize deltaY to handle different scroll speeds
            const normalizedDelta = Math.max(-3, Math.min(3, e.deltaY / 100));
            const baseFactor = 1.15;
            const zoomFactor = Math.pow(baseFactor, -normalizedDelta);

            onZoomRef.current(px, py, zoomFactor);
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
        };
    }, [isDragging]); // Re-run when isDragging changes

    // Mouse down - start dragging and notify point
    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (e.button === 0) {
                setIsDragging(true);
                lastMousePosRef.current = { x: e.clientX, y: e.clientY };

                // Notify about mouse down point for iteration display
                if (onMouseDownPoint) {
                    const canvas = canvasRef.current;
                    if (canvas) {
                        const rect = canvas.getBoundingClientRect();
                        const px = e.clientX - rect.left;
                        const py = e.clientY - rect.top;
                        onMouseDownPoint(px, py);
                    }
                }
            }
        },
        [onMouseDownPoint]
    );

    // Mouse up - end drag and notify
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        lastMousePosRef.current = null;
        onMouseUpPoint?.();
    }, [onMouseUpPoint]);

    // Mouse move - pan if dragging
    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;

            // Handle dragging - check lastMousePosRef to know if we're actually dragging
            // (state might not be updated yet within this event handler)
            if (lastMousePosRef.current) {
                // If onMouseMovePoint is provided, use drag for iteration display instead of panning
                if (onMouseMovePoint) {
                    onMouseMovePoint(px, py);
                } else {
                    // Regular pan behavior
                    const deltaX = e.clientX - lastMousePosRef.current.x;
                    const deltaY = e.clientY - lastMousePosRef.current.y;

                    // Only call if there's actual movement
                    if (deltaX !== 0 || deltaY !== 0) {
                        onPan(deltaX, deltaY);
                    }
                }
                lastMousePosRef.current = { x: e.clientX, y: e.clientY };
            }
        },
        [onPan, onMouseMovePoint]
    );

    const handleMouseLeave = useCallback(() => {
        if (lastMousePosRef.current) {
            setIsDragging(false);
            lastMousePosRef.current = null;
            onMouseUpPoint?.();
        }
    }, [onMouseUpPoint]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
    }, []);

    return (
        <div className="canvas-container">
            <canvas
                ref={canvasRef}
                width={viewport.width}
                height={viewport.height}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onContextMenu={handleContextMenu}
                style={{ cursor: customCursor || (isDragging ? 'grabbing' : (isRendering ? 'wait' : 'grab')) }}
            />
        </div>
    );
});

export default MandelbrotCanvas;
