/**
 * Mandelbrot set calculation utilities
 */

export interface Viewport {
  centerX: number;
  centerY: number;
  zoom: number;
  width: number;
  height: number;
}

/**
 * Calculate the number of iterations for a point in the complex plane
 */
export function calculateMandelbrot(
  cReal: number,
  cImag: number,
  maxIterations: number
): number {
  let zReal = 0;
  let zImag = 0;
  let iteration = 0;

  while (iteration < maxIterations) {
    const zRealSquared = zReal * zReal;
    const zImagSquared = zImag * zImag;

    // Check if escaped (|z| > 2)
    if (zRealSquared + zImagSquared > 4) {
      break;
    }

    // z = z² + c
    const newZReal = zRealSquared - zImagSquared + cReal;
    zImag = 2 * zReal * zImag + cImag;
    zReal = newZReal;

    iteration++;
  }

  // Smooth coloring for escaped points
  if (iteration < maxIterations) {
    const zMagnitude = Math.sqrt(zReal * zReal + zImag * zImag);
    const smoothValue = iteration + 1 - Math.log(Math.log(zMagnitude)) / Math.log(2);
    return smoothValue;
  }

  return iteration;
}

/**
 * Convert pixel coordinates to complex plane coordinates
 */
export function pixelToComplex(
  px: number,
  py: number,
  viewport: Viewport
): { real: number; imag: number } {
  const scale = 4 / (viewport.zoom * Math.min(viewport.width, viewport.height));
  const real = viewport.centerX + (px - viewport.width / 2) * scale;
  const imag = viewport.centerY + (py - viewport.height / 2) * scale;
  return { real, imag };
}

/**
 * Map iteration count to RGB color using a smooth gradient
 */
export function iterationToColor(
  iteration: number,
  maxIterations: number
): [number, number, number] {
  if (iteration >= maxIterations) {
    return [0, 0, 0]; // Black for points inside the set
  }

  // Normalize and create smooth color gradient
  const normalized = iteration / maxIterations;
  
  // Use HSL-like coloring for vibrant results
  const hue = 0.7 + normalized * 0.3; // Blue to purple range
  const saturation = 0.8;
  const lightness = 0.1 + normalized * 0.7;

  // Convert HSL to RGB
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((hue * 6) % 2) - 1));
  const m = lightness - c / 2;

  let r = 0, g = 0, b = 0;
  const hueSegment = Math.floor(hue * 6) % 6;

  switch (hueSegment) {
    case 0: r = c; g = x; b = 0; break;
    case 1: r = x; g = c; b = 0; break;
    case 2: r = 0; g = c; b = x; break;
    case 3: r = 0; g = x; b = c; break;
    case 4: r = x; g = 0; b = c; break;
    case 5: r = c; g = 0; b = x; break;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/**
 * Alternative gradient using multiple color bands
 */
export function iterationToColorGradient(
  iteration: number,
  maxIterations: number
): [number, number, number] {
  if (iteration >= maxIterations) {
    return [0, 0, 0];
  }

  // Create repeating color bands for visual interest at deep zooms
  const t = iteration / 50; // Band frequency
  
  const r = Math.sin(0.1 * t) * 127 + 128;
  const g = Math.sin(0.13 * t + 2) * 127 + 128;
  const b = Math.sin(0.15 * t + 4) * 127 + 128;

  return [Math.floor(r), Math.floor(g), Math.floor(b)];
}

/**
 * Render the Mandelbrot set to an ImageData buffer
 */
export function renderMandelbrot(
  imageData: ImageData,
  viewport: Viewport,
  maxIterations: number
): void {
  const { width, height } = viewport;
  const data = imageData.data;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const { real, imag } = pixelToComplex(px, py, viewport);
      const iteration = calculateMandelbrot(real, imag, maxIterations);
      const [r, g, b] = iterationToColorGradient(iteration, maxIterations);

      const index = (py * width + px) * 4;
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = 255;
    }
  }
}
