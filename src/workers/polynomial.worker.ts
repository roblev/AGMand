// Web Worker for iterative Mandelbrot calculation across complex plane

interface WorkerMessage {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    scale: number;
    iterations: number;
}

// Calculate z_n iteratively using z = z² + c
// Returns the magnitude of z after n iterations
function calculateMandelbrotIteration(cRe: number, cIm: number, iterations: number): number {
    if (iterations === 0) {
        return 0; // z₀ = 0
    }

    let zRe = 0;
    let zIm = 0;

    for (let i = 0; i < iterations; i++) {
        // z = z² + c
        const newRe = zRe * zRe - zIm * zIm + cRe;
        const newIm = 2 * zRe * zIm + cIm;
        zRe = newRe;
        zIm = newIm;

        // Early bailout if magnitude exceeds a large threshold (escaped to infinity)
        if (zRe * zRe + zIm * zIm > 1e20) {
            return Infinity;
        }
    }

    // Return magnitude
    return Math.sqrt(zRe * zRe + zIm * zIm);
}

// Map magnitude to color with contour at magnitude = 2
function magnitudeToColor(magnitude: number): { r: number; g: number; b: number } {
    // Handle edge cases
    if (!isFinite(magnitude)) {
        return { r: 100, g: 100, b: 255 }; // Blue for infinity
    }

    // Black for magnitude < 2 (inside the escape boundary)
    if (magnitude < 2) {
        return { r: 0, g: 0, b: 0 };
    }

    // Blue for magnitude > 10
    if (magnitude >= 10) {
        return { r: 50, g: 100, b: 255 };
    }

    // Smooth gradient from red -> orange -> yellow -> green -> blue for magnitude 2-10
    // Map 2-10 to 0-1
    const t = (magnitude - 2) / 8;

    // Rainbow gradient: red (0) -> orange (0.25) -> yellow (0.5) -> green (0.75) -> blue (1)
    let r: number, g: number, b: number;

    if (t < 0.25) {
        // Red to Orange (0 - 0.25)
        const s = t / 0.25;
        r = 255;
        g = Math.floor(100 * s);
        b = 0;
    } else if (t < 0.5) {
        // Orange to Yellow (0.25 - 0.5)
        const s = (t - 0.25) / 0.25;
        r = 255;
        g = Math.floor(100 + 155 * s);
        b = 0;
    } else if (t < 0.75) {
        // Yellow to Green (0.5 - 0.75)
        const s = (t - 0.5) / 0.25;
        r = Math.floor(255 * (1 - s));
        g = 255;
        b = 0;
    } else {
        // Green to Blue (0.75 - 1)
        const s = (t - 0.75) / 0.25;
        r = 0;
        g = Math.floor(255 * (1 - s));
        b = Math.floor(255 * s);
    }

    return { r, g, b };
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const { width, height, centerX, centerY, scale, iterations } = e.data;

    const imageData = new Uint8ClampedArray(width * height * 4);

    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            // Convert pixel to complex plane coordinates
            const cRe = centerX + (px - width / 2) * scale;
            const cIm = centerY + (py - height / 2) * scale;

            // Calculate magnitude using iterative Mandelbrot
            const magnitude = calculateMandelbrotIteration(cRe, cIm, iterations);

            // Convert to color
            const { r, g, b } = magnitudeToColor(magnitude);

            // Write to image data
            const idx = (py * width + px) * 4;
            imageData[idx] = r;
            imageData[idx + 1] = g;
            imageData[idx + 2] = b;
            imageData[idx + 3] = 255;
        }
    }

    self.postMessage({ imageData: imageData.buffer }, { transfer: [imageData.buffer] });
};
