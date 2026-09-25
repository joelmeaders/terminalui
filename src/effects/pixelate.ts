import { connectImageEffect, type ImageEffectController } from './shared';
export type { ImageEffectController } from './shared';

export interface PixelationOptions {
  /** Approximate size of one square pixel on screen, in CSS pixels. Default: 8. */
  pixelSize: number;
}

/** Pixelate an image in the browser. The original image keeps its alt text. */
export function mountPixelation(
  image: HTMLImageElement,
  options: Partial<PixelationOptions> = {},
): ImageEffectController<PixelationOptions> {
  let settings = { pixelSize: 8, ...options };
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is required for pixelation.');
  const effect = connectImageEffect(image, 'pixelate', canvas, (width, height) => {
    const pixelSize = Math.max(2, Number.isFinite(settings.pixelSize) ? settings.pixelSize : 8);
    canvas.width = Math.max(1, Math.ceil(width / pixelSize));
    canvas.height = Math.max(1, Math.ceil(height / pixelSize));
    context.imageSmoothingEnabled = true;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  });
  return {
    ...effect,
    update(next) {
      settings = { ...settings, ...next };
      effect.refresh();
    },
  };
}
