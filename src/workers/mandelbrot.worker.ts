/**
 * Mandelbrot Web Worker - performs calculations off the main thread
 */

interface WorkerMessage {
    imageData: ArrayBuffer;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    zoom: number;
    maxIterations: number;
}

/**
 * Check if point is in the main cardioid
 */
function inCardioid(x: number, y: number): boolean {
    const q = (x - 0.25) * (x - 0.25) + y * y;
    return q * (q + (x - 0.25)) <= 0.25 * y * y;
}

/**
 * Check if point is in the period-2 bulb
 */
function inPeriod2Bulb(x: number, y: number): boolean {
    return (x + 1) * (x + 1) + y * y <= 0.0625;
}

/**
 * Calculate iterations for a single point with optimizations
 */
function calculateMandelbrot(
    cReal: number,
    cImag: number,
    maxIterations: number
): number {
    // Early bailout for known interior regions
    if (inCardioid(cReal, cImag) || inPeriod2Bulb(cReal, cImag)) {
        return maxIterations;
    }

    let zReal = 0;
    let zImag = 0;
    let iteration = 0;

    // Periodicity checking variables
    let oldReal = 0;
    let oldImag = 0;
    let period = 0;

    while (iteration < maxIterations) {
        const zRealSquared = zReal * zReal;
        const zImagSquared = zImag * zImag;

        // Escape check
        if (zRealSquared + zImagSquared > 4) {
            // Smooth coloring
            const zMagnitude = Math.sqrt(zRealSquared + zImagSquared);
            return iteration + 1 - Math.log(Math.log(zMagnitude)) / Math.log(2);
        }

        // z = z² + c
        const newZReal = zRealSquared - zImagSquared + cReal;
        zImag = 2 * zReal * zImag + cImag;
        zReal = newZReal;

        // Periodicity checking - detect cycles
        if (zReal === oldReal && zImag === oldImag) {
            return maxIterations; // Point is periodic, definitely in set
        }

        period++;
        if (period > 20) {
            period = 0;
            oldReal = zReal;
            oldImag = zImag;
        }

        iteration++;
    }

    return maxIterations;
}

/**
 * Map iteration count to RGB color using a rich multi-hue palette
 */
function iterationToColor(
    iteration: number,
    maxIterations: number
): [number, number, number] {
    if (iteration >= maxIterations) {
        return [0, 0, 0]; // Black for points inside the set
    }

    // Use smooth iteration count for continuous coloring
    const t = iteration / maxIterations;

    // Create a rich palette cycling through multiple hues
    // Hue cycles through: blue -> cyan -> green -> yellow -> orange -> red -> magenta -> blue
    const hue = (0.6 + t * 5) % 1.0; // Start at blue, cycle through spectrum multiple times
    const saturation = 0.8 + 0.2 * Math.sin(t * Math.PI * 8); // Vary saturation
    const lightness = 0.15 + 0.55 * (1 - Math.pow(1 - t, 0.4)); // Brighter for higher iterations

    // HSL to RGB conversion
    const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = c * (1 - Math.abs((hue * 6) % 2 - 1));
    const m = lightness - c / 2;

    let r = 0, g = 0, b = 0;
    const h = hue * 6;

    if (h < 1) { r = c; g = x; b = 0; }
    else if (h < 2) { r = x; g = c; b = 0; }
    else if (h < 3) { r = 0; g = c; b = x; }
    else if (h < 4) { r = 0; g = x; b = c; }
    else if (h < 5) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return [
        Math.floor((r + m) * 255),
        Math.floor((g + m) * 255),
        Math.floor((b + m) * 255)
    ];
}

/**
 * Render Mandelbrot with symmetry optimization
 */
function renderMandelbrot(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    zoom: number,
    maxIterations: number
): void {
    const scale = 4 / (zoom * Math.min(width, height));
    const centerPixelY = height / 2;

    // Check if we can use symmetry (when imaginary center is 0)
    const useSymmetry = Math.abs(centerY) < 1e-10;
    const halfHeight = useSymmetry ? Math.ceil(height / 2) : height;

    for (let py = 0; py < halfHeight; py++) {
        for (let px = 0; px < width; px++) {
            const real = centerX + (px - width / 2) * scale;
            const imag = centerY + (py - centerPixelY) * scale;

            const iteration = calculateMandelbrot(real, imag, maxIterations);
            const [r, g, b] = iterationToColor(iteration, maxIterations);

            // Set pixel
            const index = (py * width + px) * 4;
            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
            data[index + 3] = 255;

            // Mirror pixel if using symmetry
            if (useSymmetry && py !== Math.floor(centerPixelY)) {
                const mirrorY = height - 1 - py;
                if (mirrorY >= 0 && mirrorY < height) {
                    const mirrorIndex = (mirrorY * width + px) * 4;
                    data[mirrorIndex] = r;
                    data[mirrorIndex + 1] = g;
                    data[mirrorIndex + 2] = b;
                    data[mirrorIndex + 3] = 255;
                }
            }
        }
    }
}

// Worker message handler
self.onmessage = function (e: MessageEvent<WorkerMessage>) {
    const { width, height, centerX, centerY, zoom, maxIterations } = e.data;

    // Create image data buffer
    const data = new Uint8ClampedArray(width * height * 4);

    // Render
    renderMandelbrot(data, width, height, centerX, centerY, zoom, maxIterations);

    // Send back the result
    (self as unknown as Worker).postMessage({ imageData: data.buffer }, [data.buffer]);
};
