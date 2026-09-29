import { describe, it, expect } from 'vitest';

export function calculateDpiViewport(
  logicalWidth: number,
  logicalHeight: number,
  dpr: number
) {
  return {
    bufferWidth: Math.round(logicalWidth * dpr),
    bufferHeight: Math.round(logicalHeight * dpr),
    cssWidth: `${logicalWidth}px`,
    cssHeight: `${logicalHeight}px`,
    // Screen to canvas coordinate mapping
    toCanvasPoint: (screenX: number, screenY: number, camera = { x: 0, y: 0, zoom: 1 }) => ({
      x: (screenX - camera.x) / camera.zoom,
      y: (screenY - camera.y) / camera.zoom
    })
  };
}

describe('Category 1 - Test 3: DPI Scaling Resilience (100%, 125%, 150%, 200% at 4K UHD)', () => {
  const DPI_FACTORS = [
    { scale: 1.0, name: '100% Native 4K' },
    { scale: 1.25, name: '125% Standard OPS Scaling' },
    { scale: 1.5, name: '150% Recommended Windows Scaling' },
    { scale: 2.0, name: '200% High-DPI Scaling' }
  ];

  for (const { scale, name } of DPI_FACTORS) {
    it(`guarantees exact buffer scaling and zero coordinate drift at ${name} (${scale}x)`, () => {
      // 4K UHD = 3840 x 2160 physical pixels
      const logicalW = 3840 / scale;
      const logicalH = 2160 / scale;

      const viewport = calculateDpiViewport(logicalW, logicalH, scale);

      // Physical pixel buffer must always equal 3840x2160
      expect(viewport.bufferWidth).toBe(3840);
      expect(viewport.bufferHeight).toBe(2160);

      // CSS style matches logical coordinates
      expect(viewport.cssWidth).toBe(`${logicalW}px`);
      expect(viewport.cssHeight).toBe(`${logicalH}px`);

      // Touch point mapping invariance: touch at center screen maps to exact logical center
      const touchPoint = viewport.toCanvasPoint(logicalW / 2, logicalH / 2);
      expect(touchPoint.x).toBeCloseTo(logicalW / 2, 4);
      expect(touchPoint.y).toBeCloseTo(logicalH / 2, 4);
    });
  }
});
