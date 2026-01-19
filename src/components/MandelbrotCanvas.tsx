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

    // Drag state
    const isDraggingRef = useRef(false);
    const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

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

    // Mouse wheel for zooming
    const handleWheel = useCallback(
        (e: React.WheelEvent<HTMLCanvasElement>) => {
            e.preventDefault();
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;

            // Smoother zoom factor for better precision control
            const zoomFactor = e.deltaY < 0 ? 1.25 : 1 / 1.25;
            onZoom(px, py, zoomFactor);
        },
        [onZoom]
    );

    // Mouse down - start dragging and notify point
    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (e.button === 0) {
                isDraggingRef.current = true;
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
        isDraggingRef.current = false;
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

            // Handle dragging
            if (isDraggingRef.current) {
                // If onMouseMovePoint is provided, use drag for iteration display instead of panning
                if (onMouseMovePoint) {
                    onMouseMovePoint(px, py);
                } else if (lastMousePosRef.current) {
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
        if (isDraggingRef.current) {
            isDraggingRef.current = false;
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
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onContextMenu={handleContextMenu}
                style={{ cursor: customCursor || (isDraggingRef.current ? 'grabbing' : (isRendering ? 'wait' : 'grab')) }}
            />
            {isRendering && (
                <div className="rendering-overlay">
                    <div className="spinner"></div>
                    <span>Calculating...</span>
                </div>
            )}
        </div>
    );
});

export default MandelbrotCanvas;
