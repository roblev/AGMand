import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// --- Polynomial Types and Utilities (reused from Scene3) ---

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

// Generate first N Catalan numbers
function generateCatalanNumbers(n: number): number[] {
    const catalans: number[] = [];
    catalans.push(1); // C₀ = 1

    for (let i = 1; i < n; i++) {
        const prev = catalans[i - 1];
        const next = (prev * 2 * (2 * i - 1)) / (i + 1);
        catalans.push(next);
    }

    return catalans;
}

// Format superscript
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

// Animation stages
type AnimationStage =
    | 'idle'           // Waiting for input
    | 'show-formula'   // Show zₙ = zₙ₋₁ · zₙ₋₁ + c
    | 'expand-left'    // Expand first zₙ₋₁ to polynomial
    | 'expand-right'   // Expand second zₙ₋₁ to polynomial
    | 'show-grid'      // Show multiplication grid header
    | 'fill-grid'      // Animate filling the multiplication grid
    | 'collect-terms'  // Collect like terms
    | 'final-result';  // Show final polynomial

const MAX_N = 12;
const catalanNumbers = generateCatalanNumbers(20);
const allPolynomials = generatePolynomials(MAX_N);

// Color palette for powers of c (indices 1-12)
const POWER_COLORS = [
    '', // power 0 (not highlighted)
    'power-color-1',  // c¹
    'power-color-2',  // c²
    'power-color-3',  // c³
    'power-color-4',  // c⁴
    'power-color-5',  // c⁵
    'power-color-6',  // c⁶
    'power-color-7',  // c⁷
    'power-color-8',  // c⁸
    'power-color-9',  // c⁹
    'power-color-10', // c¹⁰
    'power-color-11', // c¹¹
    'power-color-12', // c¹²
];

// Get color class for a power (for powers 1 through maxPower in final result, 2 through maxPower in grid)
function getPowerColorClass(power: number, maxPower: number, includeC1: boolean = false): string {
    const minPower = includeC1 ? 1 : 2;
    if (power < minPower || power > maxPower) return '';
    return POWER_COLORS[power] || '';
}

function Scene6() {
    const [targetN, setTargetN] = useState<number | null>(null);
    const [stage, setStage] = useState<AnimationStage>('idle');
    const [gridRevealIndex, setGridRevealIndex] = useState(0);
    const [collectRevealIndex, setCollectRevealIndex] = useState(0);
    const animationRef = useRef<number | null>(null);

    // Get the polynomial for zₙ₋₁
    const prevPolynomial = useMemo(() => {
        if (targetN === null || targetN < 2) return [];
        return allPolynomials[targetN - 1] || [];
    }, [targetN]);

    // Get the final polynomial for zₙ
    const finalPolynomial = useMemo(() => {
        if (targetN === null) return [];
        return allPolynomials[targetN] || [];
    }, [targetN]);

    // Build the multiplication grid: each cell is (term1, term2, product)
    const multiplicationGrid = useMemo(() => {
        if (prevPolynomial.length === 0) return [];

        const grid: { term1: Term; term2: Term; resultPower: number; resultCoeff: number }[] = [];

        for (const t1 of prevPolynomial) {
            for (const t2 of prevPolynomial) {
                grid.push({
                    term1: t1,
                    term2: t2,
                    resultPower: t1.power + t2.power,
                    resultCoeff: t1.coefficient * t2.coefficient
                });
            }
        }

        return grid;
    }, [prevPolynomial]);

    // Group grid cells by result power for column alignment
    const gridByColumn = useMemo(() => {
        const grouped: Map<number, typeof multiplicationGrid> = new Map();

        for (const cell of multiplicationGrid) {
            const existing = grouped.get(cell.resultPower) || [];
            existing.push(cell);
            grouped.set(cell.resultPower, existing);
        }

        // Sort by power ascending
        const sorted = Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
        return sorted;
    }, [multiplicationGrid]);

    // Clear any running animation
    const clearAnimation = useCallback(() => {
        if (animationRef.current) {
            clearTimeout(animationRef.current);
            animationRef.current = null;
        }
    }, []);

    // Start the animation sequence
    const startAnimation = useCallback((n: number) => {
        clearAnimation();

        if (n < 2 || n > MAX_N) return;

        setTargetN(n);
        setStage('show-formula');
        setGridRevealIndex(0);
        setCollectRevealIndex(0);

        // Auto-advance through stages
        const timings = {
            'show-formula': 1500,
            'expand-left': 1200,
            'expand-right': 1200,
            'show-grid': 800,
        };

        let delay = timings['show-formula'];

        animationRef.current = window.setTimeout(() => {
            setStage('expand-left');

            animationRef.current = window.setTimeout(() => {
                setStage('expand-right');

                animationRef.current = window.setTimeout(() => {
                    setStage('show-grid');

                    animationRef.current = window.setTimeout(() => {
                        setStage('fill-grid');
                    }, timings['show-grid']);
                }, timings['expand-right']);
            }, timings['expand-left']);
        }, delay);
    }, [clearAnimation]);

    // Skip grid animation - show all cells immediately when stage is reached
    useEffect(() => {
        if (stage !== 'fill-grid') return;

        const totalCells = multiplicationGrid.length;
        setGridRevealIndex(totalCells); // Reveal all cells immediately

        // Move to collect-terms stage after a brief pause
        animationRef.current = window.setTimeout(() => {
            setStage('collect-terms');
        }, 300);

        return () => clearAnimation();
    }, [stage, multiplicationGrid.length, clearAnimation]);

    // Skip column sum animation - show all columns immediately when stage is reached
    useEffect(() => {
        if (stage !== 'collect-terms') return;

        const totalPowers = gridByColumn.length + 1; // +1 for the +c term
        setCollectRevealIndex(totalPowers); // Reveal all columns immediately

        // Move to final result after a brief pause
        animationRef.current = window.setTimeout(() => {
            setStage('final-result');
        }, 300);

        return () => clearAnimation();
    }, [stage, gridByColumn.length, clearAnimation]);

    // Handle key presses
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // F2 through F8
        if (e.key.startsWith('F') && e.key.length <= 2) {
            const num = parseInt(e.key.substring(1), 10);
            if (num >= 2 && num <= 8) {
                e.preventDefault();
                startAnimation(num);
            }
        }
    }, [startAnimation]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Cleanup on unmount
    useEffect(() => {
        return () => clearAnimation();
    }, [clearAnimation]);

    // Render polynomial as JSX with Catalan highlighting using power-based colors
    const renderPolynomial = (terms: Term[], highlightCatalan: boolean = false, maxPower: number = 0) => {
        if (terms.length === 0) return <span className="formula-number">0</span>;

        return (
            <>
                {terms.map((term, i) => {
                    const showPlus = i > 0 && term.coefficient > 0;
                    const showMinus = term.coefficient < 0;
                    const absCoeff = Math.abs(term.coefficient);
                    // Check if coefficient matches expected Catalan for this power
                    const expectedCatalan = term.power >= 1 ? catalanNumbers[term.power - 1] : 0;
                    const isCatalanMatch = highlightCatalan && absCoeff === expectedCatalan;
                    // Show coefficient 1 if it's a Catalan match (so it can be highlighted)
                    const showCoeff = absCoeff !== 1 || term.power === 0 || isCatalanMatch;
                    const powerColorClass = isCatalanMatch ? getPowerColorClass(term.power, maxPower, true) : '';

                    return (
                        <span key={i}>
                            {showPlus && <span className="formula-operator"> + </span>}
                            {showMinus && <span className="formula-operator"> − </span>}
                            {showCoeff && (
                                <span
                                    className={`formula-number ${powerColorClass}`}
                                    style={isCatalanMatch ? {
                                        padding: '2px 4px',
                                        borderRadius: '4px',
                                        fontWeight: 700
                                    } : undefined}
                                    title={isCatalanMatch ? `C${formatSubscript(term.power - 1)}` : undefined}>
                                    {absCoeff}
                                </span>
                            )}
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
    };

    // Render idle state
    if (stage === 'idle' || targetN === null) {
        return (
            <div className="scene6-container">
                <div className="scene6-content glass-card">
                    <h2>Mandelbrot Formula Expansion</h2>
                    <p className="scene6-subtitle">
                        Watch the algebra unfold and discover the Catalan numbers
                    </p>

                    <div className="scene6-idle">
                        <p>Press a function key <kbd>F2</kbd> - <kbd>F8</kbd> to visualize</p>
                        <p className="scene6-hint">how <span className="math-var">z</span><sub>n</sub> expands from its recurrence</p>
                    </div>
                </div>

                <div className="overlay-container">
                    <div className="glass-card title-card">
                        <h1>Formula Expansion</h1>
                        <p>Press F2-F8 to animate expansion</p>
                    </div>
                </div>
            </div>
        );
    }

    // Get current display based on stage
    const showExpandedLeft = stage !== 'show-formula';
    const showExpandedRight = stage !== 'show-formula' && stage !== 'expand-left';
    const showGrid = stage === 'show-grid' || stage === 'fill-grid' || stage === 'collect-terms' || stage === 'final-result';
    const showCollection = stage === 'collect-terms' || stage === 'final-result';
    const showFinal = stage === 'final-result';

    return (
        <div className="scene6-container">
            <div className="scene6-content glass-card">
                <h2>Expanding <span className="math-var">z</span>{formatSubscript(targetN)}</h2>

                {/* Stage 1: Basic formula */}
                <div className="expansion-stage stage-formula">
                    <div className="formula-line main-formula">
                        <span className="formula-lhs">
                            <span className="math-var">z</span>{formatSubscript(targetN)}
                        </span>
                        <span className="formula-equals"> = </span>
                        <span className="formula-rhs">
                            {!showExpandedLeft ? (
                                <span className="z-placeholder">
                                    <span className="math-var">z</span>{formatSubscript(targetN - 1)}
                                </span>
                            ) : (
                                <span className={`expanded-bracket ${showExpandedLeft ? 'visible' : ''}`}>
                                    ({renderPolynomial(prevPolynomial, false)})
                                </span>
                            )}
                            <span className="formula-operator"> · </span>
                            {!showExpandedRight ? (
                                <span className="z-placeholder">
                                    <span className="math-var">z</span>{formatSubscript(targetN - 1)}
                                </span>
                            ) : (
                                <span className={`expanded-bracket ${showExpandedRight ? 'visible' : ''}`}>
                                    ({renderPolynomial(prevPolynomial, false)})
                                </span>
                            )}
                            <span className="formula-operator"> + </span>
                            <span className="math-var">c</span>
                        </span>
                    </div>
                </div>

                {/* Stage 3-4: Multiplication grid */}
                {showGrid && (
                    <div className="expansion-stage stage-grid">
                        <h3>Multiplication Grid</h3>
                        <div className="multiplication-table-container">
                            <table className="multiplication-table">
                                <thead>
                                    <tr>
                                        <th className="corner-cell">×</th>
                                        {prevPolynomial.map((term, i) => (
                                            <th key={i}>
                                                {term.coefficient !== 1 && <span className="formula-number">{term.coefficient}</span>}
                                                <span className="math-var">c</span>
                                                <sup className="formula-power">{formatPower(term.power, false)}</sup>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {prevPolynomial.map((rowTerm, rowIdx) => (
                                        <tr key={rowIdx}>
                                            <th>
                                                {rowTerm.coefficient !== 1 && <span className="formula-number">{rowTerm.coefficient}</span>}
                                                <span className="math-var">c</span>
                                                <sup className="formula-power">{formatPower(rowTerm.power, false)}</sup>
                                            </th>
                                            {prevPolynomial.map((colTerm, colIdx) => {
                                                const cellIndex = rowIdx * prevPolynomial.length + colIdx;
                                                const isRevealed = cellIndex < gridRevealIndex;
                                                const product = rowTerm.coefficient * colTerm.coefficient;
                                                const power = rowTerm.power + colTerm.power;
                                                const powerColorClass = getPowerColorClass(power, targetN);

                                                return (
                                                    <td
                                                        key={colIdx}
                                                        className={`grid-cell ${isRevealed ? 'revealed' : ''} ${powerColorClass}`}
                                                    >
                                                        {isRevealed && (
                                                            <>
                                                                <span className="cell-coeff">
                                                                    {product}
                                                                </span>
                                                                <span className="math-var">c</span>
                                                                <sup className="formula-power">{formatPower(power)}</sup>
                                                            </>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="grid-plus-c">
                                <span className="formula-operator">+</span>
                                <span className="math-var">c</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stage 5: Collect terms by power */}
                {showCollection && (
                    <div className="expansion-stage stage-collect">
                        <h3>Collecting Terms by Power of <span className="math-var">c</span></h3>
                        <div className="collect-columns">
                            {/* The +c term first - from the "+c" part of z = z² + c */}
                            {collectRevealIndex > 0 && (
                                <div className="collect-column revealed plus-c-column">
                                    <div className="column-header">
                                        <span className="math-var">c</span>
                                        <sup className="formula-power">¹</sup>
                                        <div className="column-source">(from +<span className="math-var">c</span>)</div>
                                    </div>
                                    <div className="column-terms">
                                        <span className="column-term">1</span>
                                    </div>
                                    <div className="column-sum">
                                        = 1
                                        <span className="catalan-badge">
                                            C{formatSubscript(0)}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {/* Separator between +c and grid columns */}
                            {collectRevealIndex > 0 && (
                                <div className="collect-separator">
                                    <span>+</span>
                                </div>
                            )}
                            {/* Grid columns from z²ₙ₋₁ */}
                            {gridByColumn.map(([power, cells], colIdx) => {
                                const isRevealed = colIdx < collectRevealIndex;
                                const sum = cells.reduce((s, c) => s + c.resultCoeff, 0);
                                const powerColorClass = getPowerColorClass(power, targetN);
                                // Check if this coefficient equals the expected Catalan number for this power
                                // User notation: C₁=1, C₂=1, C₃=2, C₄=5... so catalanNumbers[power-1]
                                const expectedCatalan = power >= 1 ? catalanNumbers[power - 1] : 0;
                                const isCatalanMatch = sum === expectedCatalan;

                                return (
                                    <div
                                        key={power}
                                        className={`collect-column ${isRevealed ? 'revealed' : ''} ${powerColorClass}`}
                                    >
                                        <div className="column-header">
                                            <span className="math-var">c</span>
                                            <sup className="formula-power">{formatPower(power)}</sup>
                                        </div>
                                        <div className="column-terms">
                                            {cells.map((cell, i) => (
                                                <span key={i} className="column-term">
                                                    {i > 0 && <span className="plus">+</span>}
                                                    {cell.resultCoeff}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="column-sum">
                                            = {sum}
                                            {isCatalanMatch && (
                                                <span className="catalan-badge">
                                                    C{formatSubscript(power - 1)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Stage 6: Final result */}
                {showFinal && (
                    <div className="expansion-stage stage-final">
                        <h3>Final Result</h3>
                        <div className="final-polynomial">
                            <span className="formula-lhs">
                                <span className="math-var">z</span>{formatSubscript(targetN)}
                            </span>
                            <span className="formula-equals"> = </span>
                            <span className="formula-rhs">
                                {renderPolynomial(finalPolynomial, true, targetN)}
                            </span>
                        </div>
                    </div>
                )}

                <div className="scene6-hint">
                    Press <kbd>F2</kbd> - <kbd>F8</kbd> to explore different iterations
                </div>
            </div>

            <div className="overlay-container">
                <div className="glass-card title-card">
                    <h1>Formula Expansion</h1>
                    <p>Discovering Catalan numbers in Mandelbrot</p>
                </div>
            </div>
        </div>
    );
}

export default Scene6;
