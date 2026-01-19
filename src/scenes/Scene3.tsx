import React, { useState, useCallback, useEffect, useRef } from 'react';

// The algebraic expansions of z_n in terms of c
// z₀ = 0
// z₁ = z₀² + c = c
// z₂ = z₁² + c = c² + c
// z₃ = z₂² + c = (c² + c)² + c = c⁴ + 2c³ + c² + c
// z₄ = z₃² + c = (c⁴ + 2c³ + c² + c)² + c
//    = c⁸ + 4c⁷ + 6c⁶ + 6c⁵ + 5c⁴ + 2c³ + c² + c
// etc.

interface Term {
    coefficient: number;
    power: number;
}

// Helper to multiply two polynomials (each represented as an array of Terms)
function multiplyPolynomials(p1: Term[], p2: Term[]): Term[] {
    const result: Map<number, number> = new Map();

    for (const t1 of p1) {
        for (const t2 of p2) {
            const power = t1.power + t2.power;
            const coeff = t1.coefficient * t2.coefficient;
            result.set(power, (result.get(power) || 0) + coeff);
        }
    }

    // Convert back to array, sorted by power ascending
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
// showOne: if false, power 1 returns empty string (for equation view)
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

// Get the maximum power across all polynomials
function getMaxPower(polynomials: Term[][]): number {
    let maxPower = 0;
    for (const poly of polynomials) {
        for (const term of poly) {
            if (term.power > maxPower) {
                maxPower = term.power;
            }
        }
    }
    return maxPower;
}

// Get coefficient for a specific power in a polynomial
function getCoefficientForPower(poly: Term[], power: number): number {
    const term = poly.find(t => t.power === power);
    return term ? term.coefficient : 0;
}

// Colors for diagonal highlighting
const HIGHLIGHT_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
];

const MAX_ITERATIONS = 8; // Beyond this, the polynomials get extremely long
const polynomials = generatePolynomials(MAX_ITERATIONS);

// Highlight state: map of "row-col" to color
interface HighlightState {
    cells: Map<string, string>;
    isAnimating: boolean;
}

function Scene3() {
    const [revealedCount, setRevealedCount] = useState(0);
    const [showMatrix, setShowMatrix] = useState(false);
    const [highlights, setHighlights] = useState<HighlightState>({ cells: new Map(), isAnimating: false });
    const animationRef = useRef<number | null>(null);

    const startHighlightAnimation = useCallback(() => {
        if (highlights.isAnimating) return;

        // Clear any existing animation
        if (animationRef.current) {
            clearTimeout(animationRef.current);
        }

        setHighlights({ cells: new Map(), isAnimating: true });

        // Animation sequence: for each diagonal (1 to 8)
        // First highlight the diagonal cell z_n/c^n for 1 second
        // Then highlight all cells below it (z_{n+1} to z_8) quickly

        const cellsToHighlight: { row: number; col: number; color: string; delay: number }[] = [];
        let currentDelay = 0;

        for (let diag = 1; diag <= 8; diag++) {
            const color = HIGHLIGHT_COLORS[diag - 1];

            // Highlight the diagonal cell (z_diag, c^diag) - hold for 1 second
            cellsToHighlight.push({ row: diag, col: diag, color, delay: currentDelay });
            currentDelay += 1000; // 1 second pause on diagonal

            // Highlight cells below (z_{diag+1} to z_8 in column c^diag) - quickly
            for (let row = diag + 1; row <= 8; row++) {
                cellsToHighlight.push({ row, col: diag, color, delay: currentDelay });
                currentDelay += 150; // 150ms between each cell below
            }

            // Small pause before next diagonal
            currentDelay += 300;
        }

        // Schedule all highlights
        cellsToHighlight.forEach(({ row, col, color, delay }) => {
            setTimeout(() => {
                setHighlights(prev => {
                    const updated = new Map(prev.cells);
                    updated.set(`${row}-${col}`, color);
                    return { ...prev, cells: updated };
                });
            }, delay);
        });

        // Mark animation as complete (but keep highlights visible)
        const totalDuration = currentDelay + 500;
        animationRef.current = window.setTimeout(() => {
            setHighlights(prev => ({ ...prev, isAnimating: false }));
        }, totalDuration);
    }, [highlights.isAnimating]);

    const clearHighlights = useCallback(() => {
        setHighlights({ cells: new Map(), isAnimating: false });
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.code === 'Space') {
            e.preventDefault();
            // Clear highlights when spacebar is pressed
            if (highlights.cells.size > 0) {
                clearHighlights();
            }
            setRevealedCount(prev => {
                if (prev < MAX_ITERATIONS + 1) {
                    return prev + 1;
                }
                // Reset after all are revealed
                return 0;
            });
        } else if (e.key === 'm' || e.key === 'M') {
            e.preventDefault();
            setShowMatrix(prev => !prev);
        } else if (e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            if (showMatrix && revealedCount > MAX_ITERATIONS) {
                startHighlightAnimation();
            }
        }
    }, [showMatrix, revealedCount, startHighlightAnimation, highlights.cells.size, clearHighlights]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Cleanup animation on unmount
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                clearTimeout(animationRef.current);
            }
        };
    }, []);

    // Generate column headers (powers of c) - only show columns needed for revealed rows
    // Start from 0 (units column) so z₀ = 0 is visible
    const revealedPolynomials = polynomials.slice(0, revealedCount);
    const currentMaxPower = revealedCount > 0 ? Math.max(0, getMaxPower(revealedPolynomials)) : -1;
    const powerHeaders: number[] = [];
    for (let p = 0; p <= currentMaxPower; p++) {
        powerHeaders.push(p);
    }

    // Get highlight color for a cell
    const getCellHighlight = (row: number, col: number): string | undefined => {
        return highlights.cells.get(`${row}-${col}`);
    };

    return (
        <div className="scene3-container">
            <div className="scene3-content glass-card">
                <h2>Mandelbrot Iteration Algebra</h2>
                <p className="scene3-subtitle">
                    Each <span className="math-var">z</span><sub>n</sub> expanded as a polynomial in <span className="math-var">c</span>
                    {showMatrix && ' — Matrix View'}
                </p>

                {!showMatrix ? (
                    // Polynomial view
                    <div className="formula-list">
                        {polynomials.slice(0, revealedCount).map((poly, i) => (
                            <div
                                key={i}
                                className="formula-item"
                                style={{
                                    animation: 'formula-fade-in 0.4s ease-out'
                                }}
                            >
                                <span className="formula-lhs">
                                    <span className="math-var">z</span>{formatSubscript(i)}
                                </span>
                                <span className="formula-equals"> = </span>
                                <span className="formula-rhs">
                                    {formatPolynomialJSX(poly)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Matrix view
                    <div className="matrix-container">
                        <table className="coefficient-matrix">
                            <thead>
                                <tr>
                                    <th></th>
                                    {powerHeaders.map(p => (
                                        <th key={p}>
                                            <span className="math-var">c</span>
                                            <sup className="formula-power">{formatPower(p)}</sup>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {polynomials.slice(0, revealedCount).map((poly, i) => (
                                    <tr
                                        key={i}
                                        style={{
                                            animation: 'formula-fade-in 0.4s ease-out'
                                        }}
                                    >
                                        <td className="matrix-row-header">
                                            <span className="math-var">z</span>{formatSubscript(i)}
                                        </td>
                                        {powerHeaders.map(p => {
                                            const coeff = getCoefficientForPower(poly, p);
                                            const highlightColor = getCellHighlight(i, p);
                                            return (
                                                <td
                                                    key={p}
                                                    className={coeff === 0 ? 'matrix-zero' : 'matrix-nonzero'}
                                                    style={highlightColor ? {
                                                        backgroundColor: highlightColor,
                                                        color: '#fff',
                                                        transition: 'background-color 0.2s linear'
                                                    } : undefined}
                                                >
                                                    {coeff}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {revealedCount === 0 && (
                    <div className="scene3-hint">
                        Press <kbd>Space</kbd> to begin
                    </div>
                )}

                {revealedCount > 0 && revealedCount <= MAX_ITERATIONS && (
                    <div className="scene3-hint">
                        Press <kbd>Space</kbd> to reveal next iteration · <kbd>M</kbd> to toggle matrix view
                    </div>
                )}

                {revealedCount > MAX_ITERATIONS && (
                    <div className="scene3-hint complete">
                        {showMatrix
                            ? <>Press <kbd>H</kbd> to highlight diagonals · <kbd>M</kbd> to toggle view · <kbd>Space</kbd> to restart</>
                            : <>Pattern continues... Press <kbd>Space</kbd> to restart · <kbd>M</kbd> to toggle matrix view</>
                        }
                    </div>
                )}
            </div>

            {/* Title overlay */}
            <div className="overlay-container">
                <div className="glass-card title-card">
                    <h1>Algebraic Expansion</h1>
                    <p>The Mandelbrot iteration in terms of <span className="math-var">c</span></p>
                </div>
            </div>
        </div>
    );
}

export default Scene3;
