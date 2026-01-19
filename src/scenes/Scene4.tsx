import React, { useState, useCallback, useEffect, useRef } from 'react';

// Polynomial term representation
interface Term {
    coefficient: number;
    power: number;
}

// Helper to multiply two polynomials
function multiplyPolynomials(p1: Term[], p2: Term[]): Term[] {
    const result: Map<number, number> = new Map();

    for (const t1 of p1) {
        for (const t2 of p2) {
            const power = t1.power + t2.power;
            const coeff = t1.coefficient * t2.coefficient;
            result.set(power, (result.get(power) || 0) + coeff);
        }
    }

    const terms: Term[] = [];
    for (const [power, coefficient] of result) {
        if (coefficient !== 0) {
            terms.push({ power, coefficient });
        }
    }
    return terms.sort((a, b) => a.power - b.power);
}

// Add two polynomials
function addPolynomials(p1: Term[], p2: Term[]): Term[] {
    const result: Map<number, number> = new Map();

    for (const t of p1) {
        result.set(t.power, (result.get(t.power) || 0) + t.coefficient);
    }
    for (const t of p2) {
        result.set(t.power, (result.get(t.power) || 0) + t.coefficient);
    }

    const terms: Term[] = [];
    for (const [power, coefficient] of result) {
        if (coefficient !== 0) {
            terms.push({ power, coefficient });
        }
    }
    return terms.sort((a, b) => a.power - b.power);
}

// Generate all z_n polynomials up to n iterations
function generatePolynomials(n: number): Term[][] {
    const polynomials: Term[][] = [];

    // z₀ = 0
    polynomials.push([]);

    // z₁ = c
    polynomials.push([{ coefficient: 1, power: 1 }]);

    // z_n = z_{n-1}² + c
    for (let i = 2; i <= n; i++) {
        const prev = polynomials[i - 1];
        const squared = multiplyPolynomials(prev, prev);
        const plusC = addPolynomials(squared, [{ coefficient: 1, power: 1 }]);
        polynomials.push(plusC);
    }

    return polynomials;
}

// Format a power as superscript
function formatPower(power: number, showOne: boolean = true): string {
    if (!showOne && power === 1) return '';
    const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    return String(power)
        .split('')
        .map(d => superscripts[parseInt(d)])
        .join('');
}

// Format subscript
function formatSubscript(n: number): string {
    const subscripts = '₀₁₂₃₄₅₆₇₈₉';
    return String(n)
        .split('')
        .map(d => subscripts[parseInt(d)])
        .join('');
}

// Format a polynomial as JSX
function formatPolynomialJSX(terms: Term[]): React.ReactNode {
    if (terms.length === 0) {
        return <span className="formula-number">0</span>;
    }

    return (
        <>
            {terms.map((term, i) => {
                const showPlus = i > 0 && term.coefficient > 0;
                const showMinus = term.coefficient < 0;
                const absCoeff = Math.abs(term.coefficient);
                const showCoeff = absCoeff !== 1 || term.power === 0;

                return (
                    <span key={i}>
                        {showPlus && <span className="formula-operator"> + </span>}
                        {showMinus && <span className="formula-operator"> − </span>}
                        {showCoeff && <span className="formula-number">{absCoeff}</span>}
                        {term.power > 0 && (
                            <>
                                <span className="math-var">c</span>
                                <sup className="formula-power">{formatPower(term.power, false)}</sup>
                            </>
                        )}
                    </span>
                );
            })}
        </>
    );
}

// Maximum iterations for polynomial display (beyond this, show "polynomial too big")
const MAX_POLYNOMIAL_DISPLAY = 8;
// Pre-generate polynomials for display (only up to z₈)
const displayPolynomials = generatePolynomials(MAX_POLYNOMIAL_DISPLAY);

// Generate formula display for current iteration
function getIterationFormula(n: number): React.ReactNode {
    if (n <= MAX_POLYNOMIAL_DISPLAY) {
        return formatPolynomialJSX(displayPolynomials[n]);
    }
    return <span className="formula-too-big">(polynomial too big)</span>;
}

const MAX_ITERATIONS = 1000;
const CANVAS_SIZE = 600;

function Scene4() {
    const [currentIteration, setCurrentIteration] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const renderIdRef = useRef(0);

    // Initialize Web Worker
    useEffect(() => {
        workerRef.current = new Worker(
            new URL('../workers/polynomial.worker.ts', import.meta.url),
            { type: 'module' }
        );

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    // Render the polynomial visualization
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        const worker = workerRef.current;
        if (!canvas || !worker) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const currentRenderId = ++renderIdRef.current;

        const handleMessage = (e: MessageEvent) => {
            if (currentRenderId !== renderIdRef.current) return;

            const { imageData } = e.data;
            const data = new Uint8ClampedArray(imageData);
            const imgData = new ImageData(data, CANVAS_SIZE, CANVAS_SIZE);

            ctx.putImageData(imgData, 0, 0);

            worker.removeEventListener('message', handleMessage);
        };

        worker.addEventListener('message', handleMessage);

        // Send iteration count to worker for iterative Mandelbrot calculation
        worker.postMessage({
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            centerX: -0.5,
            centerY: 0,
            scale: 4 / CANVAS_SIZE, // Show range from -2 to 2
            iterations: currentIteration,
        });
    }, [currentIteration]);

    // Re-render when iteration changes
    useEffect(() => {
        const timer = setTimeout(() => {
            render();
        }, 50);
        return () => clearTimeout(timer);
    }, [render]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'ArrowRight') {
            e.preventDefault();
            setCurrentIteration(prev => {
                if (prev < MAX_ITERATIONS) {
                    return prev + 1;
                }
                return e.code === 'Space' ? 0 : prev; // Space resets, ArrowRight stays at max
            });
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            setCurrentIteration(prev => Math.max(0, prev - 1));
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);



    return (
        <div className="scene4-container">
            {/* Left: Complex plane visualization */}
            <div className="scene4-canvas-wrapper">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_SIZE}
                    height={CANVAS_SIZE}
                />
                {/* Axis labels */}
                <div className="axis-label axis-label-re">Re</div>
                <div className="axis-label axis-label-im">Im</div>
            </div>

            {/* Right: Polynomial display */}
            <div className="scene4-right-panel glass-card">
                <div className="scene4-slider-control">
                    <label htmlFor="iteration-slider">Iteration: {currentIteration}</label>
                    <input
                        type="range"
                        id="iteration-slider"
                        min="0"
                        max={MAX_ITERATIONS}
                        value={currentIteration}
                        onChange={(e) => setCurrentIteration(parseInt(e.target.value, 10))}
                        className="iteration-slider"
                    />
                    <div className="slider-labels">
                        <span>0</span>
                        <span>{MAX_ITERATIONS}</span>
                    </div>
                </div>

                <h2>Polynomial Visualization</h2>
                <p className="scene4-subtitle">
                    Evaluating <span className="math-var">z</span>{formatSubscript(currentIteration)} across the complex plane
                </p>

                <div className="scene4-polynomial-display">
                    <div className="formula-item current">
                        <span className="formula-lhs">
                            <span className="math-var">z</span>{formatSubscript(currentIteration)}
                        </span>
                        <span className="formula-equals"> = </span>
                        <span className="formula-rhs">
                            {getIterationFormula(currentIteration)}
                        </span>
                    </div>
                </div>

                <div className="scene4-hint">
                    <kbd>←</kbd> <kbd>→</kbd> or <kbd>Space</kbd> to navigate iterations
                    {currentIteration === MAX_ITERATIONS && <span className="reset-hint"> (Space to reset)</span>}
                </div>
            </div>

            {/* Title overlay */}
            <div className="overlay-container">
                <div className="glass-card title-card">
                    <h1>Complex Plane</h1>
                    <p>Polynomial magnitude visualization</p>
                </div>
            </div>
        </div>
    );
}

export default Scene4;
