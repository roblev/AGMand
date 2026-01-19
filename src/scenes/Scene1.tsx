import { useState, useCallback, useRef } from 'react';
import MandelbrotCanvas from '../components/MandelbrotCanvas';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const DEFAULT_MAX_ITERATIONS = 200;
const DEFAULT_CENTER_X = -0.5;
const DEFAULT_CENTER_Y = 0;
const DEFAULT_ZOOM = 1;
const MAX_ZOOM = 1e12;

function Scene1() {
    const [centerX, setCenterX] = useState(DEFAULT_CENTER_X);
    const [centerY, setCenterY] = useState(DEFAULT_CENTER_Y);
    const [zoom, setZoom] = useState(DEFAULT_ZOOM);
    const [maxIterations, setMaxIterations] = useState(DEFAULT_MAX_ITERATIONS);
    const [resetKey, setResetKey] = useState(0);

    // Use refs for immediate access during rapid events
    const stateRef = useRef({
        centerX: DEFAULT_CENTER_X,
        centerY: DEFAULT_CENTER_Y,
        zoom: DEFAULT_ZOOM
    });

    const viewport = {
        centerX,
        centerY,
        zoom,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
    };

    // Handle zoom - receives PIXEL coordinates
    const handleZoom = useCallback(
        (pixelX: number, pixelY: number, zoomFactor: number) => {
            const { centerX: cx, centerY: cy, zoom: z } = stateRef.current;

            // Calculate new zoom level with limits
            const newZoom = Math.max(0.5, Math.min(z * zoomFactor, MAX_ZOOM));

            // If we hit the zoom limit, don't change anything
            if (newZoom === z) return;

            // Calculate the actual zoom factor applied
            const actualZoomFactor = newZoom / z;

            // Convert pixel to complex using CURRENT state
            const scale = 4 / (z * Math.min(CANVAS_WIDTH, CANVAS_HEIGHT));
            const targetX = cx + (pixelX - CANVAS_WIDTH / 2) * scale;
            const targetY = cy + (pixelY - CANVAS_HEIGHT / 2) * scale;

            // Compute new center to keep target point fixed
            const offsetX = cx - targetX;
            const offsetY = cy - targetY;
            const newCenterX = targetX + offsetX / actualZoomFactor;
            const newCenterY = targetY + offsetY / actualZoomFactor;

            // Update ref IMMEDIATELY
            stateRef.current = { centerX: newCenterX, centerY: newCenterY, zoom: newZoom };

            // Update React state
            setCenterX(newCenterX);
            setCenterY(newCenterY);
            setZoom(newZoom);

            // Adjust iterations based on zoom level
            const logZoom = Math.log10(newZoom);
            const targetIterations = Math.min(200 + logZoom * 100, 2000);
            setMaxIterations(Math.round(targetIterations / 50) * 50);
        },
        []
    );

    // Handle pan - receives incremental PIXEL delta
    const handlePan = useCallback(
        (deltaPixelX: number, deltaPixelY: number) => {
            const { centerX: cx, centerY: cy, zoom: z } = stateRef.current;

            // Convert pixel delta to complex delta using current zoom
            const scale = 4 / (z * Math.min(CANVAS_WIDTH, CANVAS_HEIGHT));
            const deltaCx = deltaPixelX * scale;
            const deltaCy = deltaPixelY * scale;

            // Apply delta (subtract because dragging right should move view left)
            const newCenterX = cx - deltaCx;
            const newCenterY = cy - deltaCy;

            // Update ref immediately
            stateRef.current = { centerX: newCenterX, centerY: newCenterY, zoom: z };

            setCenterX(newCenterX);
            setCenterY(newCenterY);
        },
        []
    );

    // Reset to default view
    const handleReset = useCallback(() => {
        stateRef.current = {
            centerX: DEFAULT_CENTER_X,
            centerY: DEFAULT_CENTER_Y,
            zoom: DEFAULT_ZOOM
        };
        setCenterX(DEFAULT_CENTER_X);
        setCenterY(DEFAULT_CENTER_Y);
        setZoom(DEFAULT_ZOOM);
        setMaxIterations(DEFAULT_MAX_ITERATIONS);
        setResetKey((prev) => prev + 1);
    }, []);

    const formatNumber = (num: number): string => {
        if (Math.abs(num) < 0.0001 || Math.abs(num) >= 10000) {
            return num.toExponential(4);
        }
        return num.toFixed(6);
    };

    return (
        <>
            {/* Full-screen canvas */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                <MandelbrotCanvas
                    key={resetKey}
                    viewport={viewport}
                    maxIterations={maxIterations}
                    onZoom={handleZoom}
                    onPan={handlePan}
                />
            </div>

            {/* Scene 1 UI Overlay - AGCube style */}
            <div className="overlay-container">
                <div className="glass-card title-card">
                    <h1>Mandelbrot Set</h1>
                    <p>Scroll to zoom • Drag to pan</p>
                </div>

                <div className="glass-card">
                    <div className="control-group">
                        <div className="slider-label">
                            <span>Center</span>
                            <span className="slider-value">{formatNumber(centerX)} + {formatNumber(centerY)}i</span>
                        </div>
                    </div>
                    <div className="control-group">
                        <div className="slider-label">
                            <span>Zoom</span>
                            <span className="slider-value">{zoom >= 1000 ? zoom.toExponential(2) : zoom.toFixed(2)}x</span>
                        </div>
                    </div>
                    <div className="control-group">
                        <div className="slider-label">
                            <span>Max Iterations</span>
                            <span className="slider-value">{maxIterations}</span>
                        </div>
                        <input
                            type="range"
                            className="custom-slider"
                            min="50"
                            max="2000"
                            step="50"
                            value={maxIterations}
                            onChange={(e) => setMaxIterations(Number(e.target.value))}
                        />
                    </div>
                    <button className="reset-btn" onClick={handleReset}>
                        Reset View
                    </button>
                </div>
            </div>
        </>
    );
}

export default Scene1;
