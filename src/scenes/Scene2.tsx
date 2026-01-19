import React, { useState, useCallback } from 'react';
import MandelbrotCanvas from '../components/MandelbrotCanvas';

const CANVAS_SIZE = 800;
const MAX_ITERATIONS = 200;
const CENTER_X = -0.6;
const CENTER_Y = 0;
const ZOOM = 1.3;
const NUM_ITERATIONS = 15;

interface Complex {
    re: number;
    im: number;
}

// Compute z^2 + c
function complexSquarePlusC(z: Complex, c: Complex): Complex {
    return {
        re: z.re * z.re - z.im * z.im + c.re,
        im: 2 * z.re * z.im + c.im
    };
}

// Format a number to 4 significant figures
function formatNum(n: number): string {
    const abs = Math.abs(n);
    if (abs === 0) return '0';
    if (abs >= 1000 || abs < 0.001) {
        return n.toPrecision(4);
    }
    return n.toPrecision(4);
}

// Format complex number as string (for subtitle)
function formatComplexStr(z: Complex): string {
    const reStr = formatNum(z.re);
    const imAbs = formatNum(Math.abs(z.im));
    const sign = z.im >= 0 ? '+' : '-';
    return `${reStr} ${sign} ${imAbs}i`;
}

// Format complex number as JSX (for iteration values with styled 'i')
function formatComplexJSX(z: Complex): React.ReactNode {
    const reStr = formatNum(z.re);
    const imAbs = formatNum(Math.abs(z.im));
    const sign = z.im >= 0 ? ' + ' : ' - ';
    return (
        <>
            {reStr}{sign}{imAbs}<span className="imag-i">i</span>
        </>
    );
}

// Fixed viewport - no panning or zooming in this scene
const viewport = {
    centerX: CENTER_X,
    centerY: CENTER_Y,
    zoom: ZOOM,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
};

function Scene2() {
    const [selectedC, setSelectedC] = useState<Complex | null>(null);

    // No-op handlers - panning and zooming not needed in this scene
    const handleZoom = useCallback(() => { }, []);
    const handlePan = useCallback(() => { }, []);

    // Convert pixel to complex coordinates
    const pixelToComplex = useCallback((pixelX: number, pixelY: number): Complex => {
        const scale = 4 / (ZOOM * CANVAS_SIZE);
        const re = CENTER_X + (pixelX - CANVAS_SIZE / 2) * scale;
        const im = CENTER_Y + (pixelY - CANVAS_SIZE / 2) * scale;
        return { re, im };
    }, []);

    // Convert complex coordinates to pixel
    const complexToPixel = useCallback((z: Complex): { x: number; y: number } => {
        const scale = 4 / (ZOOM * CANVAS_SIZE);
        const x = (z.re - CENTER_X) / scale + CANVAS_SIZE / 2;
        const y = (z.im - CENTER_Y) / scale + CANVAS_SIZE / 2;
        return { x, y };
    }, []);

    // Handle mouse down on a point - show iterations
    const handleMouseDownPoint = useCallback((pixelX: number, pixelY: number) => {
        setSelectedC(pixelToComplex(pixelX, pixelY));
    }, [pixelToComplex]);

    // Handle mouse move - update iterations dynamically
    const handleMouseMovePoint = useCallback((pixelX: number, pixelY: number) => {
        setSelectedC(pixelToComplex(pixelX, pixelY));
    }, [pixelToComplex]);

    // Handle mouse up - hide iterations
    const handleMouseUpPoint = useCallback(() => {
        setSelectedC(null);
    }, []);

    // Compute iterations if c is selected
    const iterations: Complex[] = [];
    if (selectedC) {
        let z: Complex = { re: 0, im: 0 };
        iterations.push(z);
        for (let i = 1; i <= NUM_ITERATIONS; i++) {
            z = complexSquarePlusC(z, selectedC);
            iterations.push(z);
        }
    }

    // Convert iterations to pixel coordinates for rendering
    const iterationPixels = iterations.map(z => complexToPixel(z));


    return (
        <div className="scene2-container">
            {/* Left: Mandelbrot canvas */}
            <div className="scene2-canvas-wrapper">
                <MandelbrotCanvas
                    viewport={viewport}
                    maxIterations={MAX_ITERATIONS}
                    onZoom={handleZoom}
                    onPan={handlePan}
                    onMouseDownPoint={handleMouseDownPoint}
                    onMouseMovePoint={handleMouseMovePoint}
                    onMouseUpPoint={handleMouseUpPoint}
                    customCursor="crosshair"
                />
                {/* Iteration chain overlay */}
                {selectedC && iterationPixels.length > 1 && (
                    <svg className="iteration-chain-overlay" width={CANVAS_SIZE} height={CANVAS_SIZE}>
                        {/* Connecting lines - start from z1 */}
                        {iterationPixels.slice(1, -1).map((p, i) => {
                            const next = iterationPixels[i + 2];
                            // Skip if any point is too far outside the canvas
                            if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(next.x) || !isFinite(next.y)) return null;
                            return (
                                <line
                                    key={`line-${i}`}
                                    x1={p.x}
                                    y1={p.y}
                                    x2={next.x}
                                    y2={next.y}
                                    stroke="rgba(255, 255, 255, 0.6)"
                                    strokeWidth={1.5}
                                />
                            );
                        })}
                        {/* Dots at each iteration - skip z0, start from z1 */}
                        {iterationPixels.slice(1).map((p, i) => {
                            // Skip if point is too far outside the canvas
                            if (!isFinite(p.x) || !isFinite(p.y)) return null;
                            return (
                                <circle
                                    key={`dot-${i}`}
                                    cx={p.x}
                                    cy={p.y}
                                    r={3}
                                    fill="#fff"
                                />
                            );
                        })}
                    </svg>
                )}
            </div>

            {/* Right: Iteration formulas */}
            <div className="iteration-panel glass-card">
                <h2>Mandelbrot Iterations</h2>
                <p className="iteration-subtitle">
                    {selectedC
                        ? <><span className="math-var">c</span> = {formatComplexStr(selectedC)}</>
                        : 'Click and drag on the Mandelbrot set'}
                </p>
                <div className="iteration-list">
                    <div className="iteration-item">
                        <span className="iteration-formula"><span className="math-var">z</span>₀ = 0</span>
                        {selectedC && (
                            <span className="iteration-value">= 0{' + '}0<span className="imag-i">i</span></span>
                        )}
                    </div>
                    {Array.from({ length: NUM_ITERATIONS }, (_, i) => {
                        const n = i + 1;
                        const subscript = String(n).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[parseInt(d)]).join('');
                        const prevSubscript = String(n - 1).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[parseInt(d)]).join('');
                        return (
                            <div key={n} className="iteration-item">
                                <span className="iteration-formula">
                                    <span className="math-var">z</span>{subscript} = <span className="math-var">z</span>{prevSubscript}² + <span className="math-var">c</span>
                                </span>
                                {selectedC && iterations[n] && (
                                    <span className="iteration-value">
                                        = {formatComplexJSX(iterations[n])}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
                {/* Conclusion */}
                {selectedC && iterations[NUM_ITERATIONS] && (
                    <div className="iteration-conclusion">
                        {(() => {
                            const z = iterations[NUM_ITERATIONS];
                            const magnitude = Math.sqrt(z.re * z.re + z.im * z.im);
                            const isOutside = magnitude >= 2 || !isFinite(magnitude);
                            return (
                                <>
                                    <span className="conclusion-label">|<span className="math-var">z</span>₁₅| = {formatNum(magnitude)}</span>
                                    <span className={`conclusion-result ${isOutside ? 'outside' : 'inside'}`}>
                                        {isOutside ? '≥ 2 → Outside set' : '< 2 → Inside set'}
                                    </span>
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Title overlay */}
            <div className="overlay-container">
                <div className="glass-card title-card">
                    <h1>Mandelbrot Iterations</h1>
                    <p>Click and drag to see iteration values for any point</p>
                </div>
            </div>
        </div>
    );
}

export default Scene2;
