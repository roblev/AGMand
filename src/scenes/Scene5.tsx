import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

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

// Intro animation phases
type IntroPhase = 'none' | 'ascending' | 'descending' | 'done';

// Intro animation step
interface IntroStep {
    phase: 'ascending' | 'descending';
    sourceIndex: number; // Index in the Catalan table (LHS)
    targetRow: number; // Which row in the RHS
    targetSide: 'left' | 'right'; // Which box in the row
}

// Flying number for visual animation
interface FlyingNumber {
    id: number;
    value: number;
    sourceIndex: number;
    targetRow: number;
    targetSide: 'left' | 'right';
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    isAnimating: boolean;
}

function Scene5() {
    const [targetN, setTargetN] = useState<number | null>(null);
    const [animationSteps, setAnimationSteps] = useState<AnimationStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isAnimating, setIsAnimating] = useState(false);
    const animationRef = useRef<number | null>(null);

    // Intro animation state
    const [introPhase, setIntroPhase] = useState<IntroPhase>('none');
    const [introStepIndex, setIntroStepIndex] = useState(-1);
    const [introSteps, setIntroSteps] = useState<IntroStep[]>([]);
    const introAnimationRef = useRef<number | null>(null);

    // Flying numbers state
    const [flyingNumbers, setFlyingNumbers] = useState<FlyingNumber[]>([]);
    const flyingIdCounter = useRef(0);

    // Refs for DOM elements to calculate animation positions
    const containerRef = useRef<HTMLDivElement>(null);
    const lhsValueRefs = useRef<Map<number, HTMLTableCellElement>>(new Map());
    const rhsLeftBoxRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
    const rhsRightBoxRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
    const rhsRowsRef = useRef<HTMLDivElement>(null);

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

    // Build intro animation steps - first ascending order, then descending order
    const buildIntroSteps = useCallback((n: number): IntroStep[] => {
        const steps: IntroStep[] = [];

        // Ascending: C_0 to C_{n-1} go to LEFT boxes of rows 0 to n-1
        for (let i = 0; i < n; i++) {
            steps.push({
                phase: 'ascending',
                sourceIndex: i,
                targetRow: i,
                targetSide: 'left'
            });
        }

        // Descending: C_{n-1} to C_0 go to RIGHT boxes of rows 0 to n-1
        for (let i = 0; i < n; i++) {
            const j = n - 1 - i;  // j goes n-1, n-2, ..., 0
            steps.push({
                phase: 'descending',
                sourceIndex: j,
                targetRow: i,
                targetSide: 'right'
            });
        }

        return steps;
    }, []);

    // Spawn a flying number from LHS to RHS
    const spawnFlyingNumber = useCallback((step: IntroStep) => {
        const container = containerRef.current;
        const sourceCell = lhsValueRefs.current.get(step.sourceIndex);
        const targetBox = step.targetSide === 'left'
            ? rhsLeftBoxRefs.current.get(step.targetRow)
            : rhsRightBoxRefs.current.get(step.targetRow);

        if (!container || !sourceCell || !targetBox) return;

        const containerRect = container.getBoundingClientRect();
        const sourceRect = sourceCell.getBoundingClientRect();
        const targetRect = targetBox.getBoundingClientRect();

        const newFlyingNumber: FlyingNumber = {
            id: flyingIdCounter.current++,
            value: catalanNumbers[step.sourceIndex],
            sourceIndex: step.sourceIndex,
            targetRow: step.targetRow,
            targetSide: step.targetSide,
            startX: sourceRect.left - containerRect.left + sourceRect.width / 2,
            startY: sourceRect.top - containerRect.top + sourceRect.height / 2,
            endX: targetRect.left - containerRect.left + targetRect.width / 2,
            endY: targetRect.top - containerRect.top + targetRect.height / 2,
            isAnimating: true
        };

        setFlyingNumbers(prev => [...prev, newFlyingNumber]);

        // Remove after animation completes
        setTimeout(() => {
            setFlyingNumbers(prev => prev.filter(f => f.id !== newFlyingNumber.id));
        }, 650);
    }, []);

    // Start animation for a given n
    const startAnimation = useCallback((n: number) => {
        // Clear any existing animation
        if (animationRef.current) {
            clearTimeout(animationRef.current);
        }
        if (introAnimationRef.current) {
            clearTimeout(introAnimationRef.current);
        }

        setTargetN(n);
        setFlyingNumbers([]);
        const mainSteps = buildAnimationSteps(n);
        const introAnimSteps = buildIntroSteps(n);

        setAnimationSteps(mainSteps);
        setIntroSteps(introAnimSteps);
        setCurrentStepIndex(-1);
        setIntroStepIndex(-1);
        setIsAnimating(true);
        setIntroPhase('ascending');

        // Start with intro animation - delay to allow RHS to render
        let introIdx = 0;
        const animateIntro = () => {
            if (introIdx < introAnimSteps.length) {
                const currentIntroStep = introAnimSteps[introIdx];

                // Update phase if we switch from ascending to descending
                if (currentIntroStep.phase === 'descending' && introIdx > 0 &&
                    introAnimSteps[introIdx - 1].phase === 'ascending') {
                    setIntroPhase('descending');
                    // Pause before descending phase
                    introAnimationRef.current = window.setTimeout(() => {
                        spawnFlyingNumber(introAnimSteps[introIdx]);
                        setIntroStepIndex(introIdx);
                        introIdx++;
                        introAnimationRef.current = window.setTimeout(animateIntro, 400);
                    }, 700);
                    return;
                }

                // Spawn flying number
                spawnFlyingNumber(currentIntroStep);
                setIntroStepIndex(introIdx);
                introIdx++;
                introAnimationRef.current = window.setTimeout(animateIntro, 400);
            } else {
                // Intro done, start main animation
                setIntroPhase('done');
                let stepIndex = 0;
                const animateStep = () => {
                    if (stepIndex < mainSteps.length) {
                        setCurrentStepIndex(stepIndex);
                        stepIndex++;
                        animationRef.current = window.setTimeout(animateStep, 600);
                    } else {
                        setIsAnimating(false);
                    }
                };
                // Start main animation after a brief delay
                animationRef.current = window.setTimeout(animateStep, 500);
            }
        };

        // Start intro after a brief delay to ensure DOM is rendered
        introAnimationRef.current = window.setTimeout(animateIntro, 500);
    }, [buildAnimationSteps, buildIntroSteps, spawnFlyingNumber]);

    // Handle key presses - use function keys to avoid conflict with scene selection
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // F2 through F12 for visualization
        if (e.key >= 'F2' && e.key <= 'F9' || e.key === 'F10' || e.key === 'F11' || e.key === 'F12') {
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
            if (introAnimationRef.current) {
                clearTimeout(introAnimationRef.current);
            }
        };
    }, []);

    // Compute which boxes have been filled during intro animation
    const filledLeftBoxes = useMemo(() => {
        if (introPhase === 'none' || targetN === null) return new Set<number>();
        const filled = new Set<number>();
        for (let i = 0; i <= introStepIndex; i++) {
            const step = introSteps[i];
            if (step && step.targetSide === 'left') {
                filled.add(step.targetRow);
            }
        }
        return filled;
    }, [introPhase, introStepIndex, introSteps, targetN]);

    const filledRightBoxes = useMemo(() => {
        if (introPhase === 'none' || targetN === null) return new Set<number>();
        const filled = new Set<number>();
        for (let i = 0; i <= introStepIndex; i++) {
            const step = introSteps[i];
            if (step && step.targetSide === 'right') {
                filled.add(step.targetRow);
            }
        }
        return filled;
    }, [introPhase, introStepIndex, introSteps, targetN]);

    // Current intro step for highlighting source in LHS
    const currentIntroSource = useMemo(() => {
        if (introPhase === 'none' || introPhase === 'done' || introStepIndex < 0) return -1;
        const step = introSteps[introStepIndex];
        return step ? step.sourceIndex : -1;
    }, [introPhase, introStepIndex, introSteps]);

    // Check if intro is complete (all boxes filled)
    const introComplete = introPhase === 'done';

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
        <div className="scene5-container" ref={containerRef}>
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
                            {catalanNumbers.map((value, n) => {
                                // Determine highlight states
                                const isTarget = targetN !== null && n === targetN;
                                const isSourceNumber = targetN !== null && n < targetN;
                                const isCurrentlyFlying = n === currentIntroSource;
                                const isMainHighlight = introComplete && (n === leftIdx || n === rightIdx);

                                // Build class names
                                let rowClass = '';
                                if (isTarget) {
                                    rowClass = 'highlight-target';
                                } else if (isCurrentlyFlying || isMainHighlight) {
                                    rowClass = 'highlight';
                                } else if (isSourceNumber) {
                                    rowClass = 'highlight-source';
                                }

                                return (
                                    <tr key={n} className={rowClass}>
                                        <td className="catalan-index">{n}</td>
                                        <td
                                            className="catalan-value"
                                            ref={el => {
                                                if (el) lhsValueRefs.current.set(n, el);
                                            }}
                                        >
                                            {formatNumber(value)}
                                        </td>
                                    </tr>
                                );
                            })}
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
                        <p>Press a function key <kbd>F2</kbd> - <kbd>F12</kbd> to visualize</p>
                        <p className="recurrence-hint">how <span className="math-var">C</span><sub><span className="math-var">n</span></sub> is computed from previous values</p>
                    </div>
                ) : (
                    <div className="recurrence-visualization">
                        {/* Header showing target */}
                        <div className="recurrence-target">
                            Computing <span className="math-var">C</span>{formatSubscript(targetN)} = {formatNumber(catalanNumbers[targetN])}
                        </div>

                        {/* Row-by-row multiplication display */}
                        <div className="multiplication-rows" ref={rhsRowsRef}>
                            {Array.from({ length: targetN }, (_, i) => {
                                const j = targetN - 1 - i;
                                const isActive = introComplete && i === leftIdx;
                                const isCompleted = completedProducts.some(p => p.i === i);
                                const showResult = isCompleted || (isActive && showingMultiply);

                                // Check if boxes are filled by intro animation
                                const leftFilled = filledLeftBoxes.has(i);
                                const rightFilled = filledRightBoxes.has(i);

                                return (
                                    <div
                                        key={i}
                                        className={`mult-row ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                    >
                                        <span className="mult-left">
                                            <span className="mult-label"><span className="math-var">C</span>{formatSubscript(i)}</span>
                                            <span
                                                className={`mult-value ${leftFilled ? 'intro-visible' : 'intro-hidden'}`}
                                                ref={el => {
                                                    if (el) rhsLeftBoxRefs.current.set(i, el);
                                                }}
                                            >
                                                {catalanNumbers[i]}
                                            </span>
                                        </span>
                                        <span className={`mult-symbol ${isActive || isCompleted ? 'visible' : ''}`}>×</span>
                                        <span className="mult-right">
                                            <span className="mult-label"><span className="math-var">C</span>{formatSubscript(j)}</span>
                                            <span
                                                className={`mult-value ${rightFilled ? 'intro-visible' : 'intro-hidden'}`}
                                                ref={el => {
                                                    if (el) rhsRightBoxRefs.current.set(i, el);
                                                }}
                                            >
                                                {catalanNumbers[j]}
                                            </span>
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
                            <span className={`sum-value ${!isAnimating && targetN !== null && totalSum === catalanNumbers[targetN] ? 'complete' : ''}`}>
                                {totalSum}
                                {!isAnimating && targetN !== null && totalSum === catalanNumbers[targetN] && (
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
                    <p>Press F2-F12 to animate recurrence</p>
                </div>
            </div>

            {/* Flying numbers overlay */}
            {flyingNumbers.map(fn => (
                <div
                    key={fn.id}
                    className="flying-number"
                    style={{
                        '--start-x': `${fn.startX}px`,
                        '--start-y': `${fn.startY}px`,
                        '--end-x': `${fn.endX}px`,
                        '--end-y': `${fn.endY}px`,
                    } as React.CSSProperties}
                >
                    {fn.value}
                </div>
            ))}
        </div>
    );
}

export default Scene5;
