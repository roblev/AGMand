import { useState, useEffect, useCallback, useRef } from 'react';

// Generate first N Catalan numbers
function generateCatalanNumbers(n: number): number[] {
    const catalans: number[] = [];

    // C₀ = 1
    catalans.push(1);

    // Use the recurrence: Cₙ = (2(2n-1) / (n+1)) × Cₙ₋₁
    for (let i = 1; i < n; i++) {
        const prev = catalans[i - 1];
        const next = (prev * 2 * (2 * i - 1)) / (i + 1);
        catalans.push(next);
    }

    return catalans;
}

// Format a number as subscript
function formatSubscript(n: number): string {
    const subscripts = '₀₁₂₃₄₅₆₇₈₉';
    return String(n)
        .split('')
        .map(d => subscripts[parseInt(d)])
        .join('');
}

// Format number with commas
function formatNumber(n: number): string {
    return n.toLocaleString();
}

const NUM_CATALAN = 21;
const catalanNumbers = generateCatalanNumbers(NUM_CATALAN);

// Animation step for the recurrence visualization
interface AnimationStep {
    type: 'show-pair' | 'multiply' | 'add-to-sum';
    i: number;
    j: number;
    product?: number;
    runningSum?: number;
}

function Scene5() {
    const [targetN, setTargetN] = useState<number | null>(null);
    const [animationSteps, setAnimationSteps] = useState<AnimationStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isAnimating, setIsAnimating] = useState(false);
    const animationRef = useRef<number | null>(null);

    // Build animation steps for computing C_n via recurrence
    const buildAnimationSteps = useCallback((n: number): AnimationStep[] => {
        const steps: AnimationStep[] = [];
        let runningSum = 0;

        // C_n = sum_{i=0}^{n-1} C_i * C_{n-1-i}
        for (let i = 0; i < n; i++) {
            const j = n - 1 - i;
            const product = catalanNumbers[i] * catalanNumbers[j];

            // Step 1: Show the pair being multiplied
            steps.push({ type: 'show-pair', i, j });

            // Step 2: Show the multiplication result
            steps.push({ type: 'multiply', i, j, product });

            // Step 3: Add to running sum
            runningSum += product;
            steps.push({ type: 'add-to-sum', i, j, product, runningSum });
        }

        return steps;
    }, []);

    // Start animation for a given n
    const startAnimation = useCallback((n: number) => {
        // Clear any existing animation
        if (animationRef.current) {
            clearTimeout(animationRef.current);
        }

        setTargetN(n);
        const steps = buildAnimationSteps(n);
        setAnimationSteps(steps);
        setCurrentStepIndex(-1);
        setIsAnimating(true);

        // Animate through steps
        let stepIndex = 0;
        const animateStep = () => {
            if (stepIndex < steps.length) {
                setCurrentStepIndex(stepIndex);
                stepIndex++;
                animationRef.current = window.setTimeout(animateStep, 600);
            } else {
                setIsAnimating(false);
            }
        };

        // Start after a brief delay
        animationRef.current = window.setTimeout(animateStep, 300);
    }, [buildAnimationSteps]);

    // Handle key presses - use function keys to avoid conflict with scene selection
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // F2 through F9 for visualization
        if (e.key >= 'F2' && e.key <= 'F9') {
            e.preventDefault();
            const n = parseInt(e.key.substring(1), 10); // Extract number from "F2", "F3", etc.
            startAnimation(n);
        }
    }, [startAnimation]);

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

    // Get current animation state
    const currentStep = currentStepIndex >= 0 ? animationSteps[currentStepIndex] : null;

    // Calculate what's visible in the animation
    const getHighlightedPairs = () => {
        if (!currentStep || targetN === null) return { leftIdx: -1, rightIdx: -1 };
        return { leftIdx: currentStep.i, rightIdx: currentStep.j };
    };

    const { leftIdx, rightIdx } = getHighlightedPairs();

    // Get completed multiplications (all steps of type 'add-to-sum' before current)
    const completedProducts: { i: number; j: number; product: number }[] = [];
    for (let s = 0; s <= currentStepIndex; s++) {
        const step = animationSteps[s];
        if (step && step.type === 'add-to-sum' && step.product !== undefined) {
            completedProducts.push({ i: step.i, j: step.j, product: step.product });
        }
    }

    // Calculate total sum from completed products
    const totalSum = completedProducts.reduce((sum, p) => sum + p.product, 0);

    // Current multiplication being shown
    const showingMultiply = currentStep?.type === 'multiply' || currentStep?.type === 'add-to-sum';

    return (
        <div className="scene5-container">
            {/* Left panel - Catalan numbers (compact) */}
            <div className="scene5-left glass-card">
                <h2>Catalan Numbers</h2>
                <div className="catalan-table-container compact">
                    <table className="catalan-table">
                        <thead>
                            <tr>
                                <th><span className="math-var">n</span></th>
                                <th><span className="math-var">C</span><sub><span className="math-var">n</span></sub></th>
                            </tr>
                        </thead>
                        <tbody>
                            {catalanNumbers.map((value, n) => (
                                <tr key={n} className={targetN !== null && (n === leftIdx || n === rightIdx) ? 'highlight' : ''}>
                                    <td className="catalan-index">{n}</td>
                                    <td className="catalan-value">{formatNumber(value)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Recurrence formula */}
                <div className="formula-compact">
                    <span className="math-var">C</span><sub><span className="math-var">n</span></sub>
                    <span className="formula-equals"> = </span>
                    <span className="summation-inline">Σ</span>
                    <span className="math-var">C</span><sub><span className="math-var">i</span></sub>
                    <span className="formula-operator">×</span>
                    <span className="math-var">C</span><sub><span className="math-var">n</span>−1−<span className="math-var">i</span></sub>
                </div>
            </div>

            {/* Right panel - Recurrence visualization */}
            <div className="scene5-right glass-card">
                <h2>Recurrence Visualization</h2>

                {targetN === null ? (
                    <div className="recurrence-empty">
                        <p>Press a function key <kbd>F2</kbd> - <kbd>F9</kbd> to visualize</p>
                        <p className="recurrence-hint">how <span className="math-var">C</span><sub><span className="math-var">n</span></sub> is computed from previous values</p>
                    </div>
                ) : (
                    <div className="recurrence-visualization">
                        {/* Header showing target */}
                        <div className="recurrence-target">
                            Computing <span className="math-var">C</span>{formatSubscript(targetN)} = {formatNumber(catalanNumbers[targetN])}
                        </div>

                        {/* Row-by-row multiplication display */}
                        <div className="multiplication-rows">
                            {Array.from({ length: targetN }, (_, i) => {
                                const j = targetN - 1 - i;
                                const isActive = i === leftIdx;
                                const isCompleted = completedProducts.some(p => p.i === i);
                                const showResult = isCompleted || (isActive && showingMultiply);

                                return (
                                    <div
                                        key={i}
                                        className={`mult-row ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                    >
                                        <span className="mult-left">
                                            <span className="mult-label"><span className="math-var">C</span>{formatSubscript(i)}</span>
                                            <span className="mult-value">{catalanNumbers[i]}</span>
                                        </span>
                                        <span className={`mult-symbol ${isActive || isCompleted ? 'visible' : ''}`}>×</span>
                                        <span className="mult-right">
                                            <span className="mult-label"><span className="math-var">C</span>{formatSubscript(j)}</span>
                                            <span className="mult-value">{catalanNumbers[j]}</span>
                                        </span>
                                        <span className={`mult-equals ${showResult ? 'visible' : ''}`}>=</span>
                                        <span className={`mult-product ${showResult ? 'visible' : ''}`}>
                                            {catalanNumbers[i] * catalanNumbers[j]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Running sum display */}
                        <div className="running-sum">
                            <span className="sum-label">Sum: </span>
                            {completedProducts.map((p, idx) => (
                                <span key={idx} className="sum-term">
                                    {idx > 0 && <span className="sum-plus"> + </span>}
                                    <span className="sum-product">{p.product}</span>
                                </span>
                            ))}
                            {completedProducts.length === 0 && <span className="sum-empty">—</span>}
                            <span className="sum-equals"> = </span>
                            <span className={`sum-value ${!isAnimating && totalSum === catalanNumbers[targetN] ? 'complete' : ''}`}>
                                {totalSum}
                                {!isAnimating && totalSum === catalanNumbers[targetN] && (
                                    <span className="sum-check"> ✓</span>
                                )}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Title overlay */}
            <div className="overlay-container">
                <div className="glass-card title-card">
                    <h1>Catalan Numbers</h1>
                    <p>Press F2-F9 to animate recurrence</p>
                </div>
            </div>
        </div>
    );
}

export default Scene5;
