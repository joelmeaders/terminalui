import { connectImageEffect, type ImageEffectController } from './shared';
export type { ImageEffectController } from './shared';

export interface AsciiOptions {
  /** Height of one text cell, in CSS pixels. Default: 10. */
  cellSize: number;
  /** Characters from lightest to darkest. Default: " .:-=+*#%@". */
  characters: string;
  /** Reverse the light-to-dark character order. Default: false. */
  invert: boolean;
}

/** Draw an image as decorative ASCII text. The original image keeps its alt text. */
export function mountAscii(
  image: HTMLImageElement,
  options: Partial<AsciiOptions> = {},
): ImageEffectController<AsciiOptions> {
  let settings = { cellSize: 10, characters: ' .:-=+*#%@', invert: false, ...options };
  const output = document.createElement('pre');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas 2D is required for ASCII conversion.');
  const effect = connectImageEffect(image, 'ascii', output, (width, height) => {
    const characters = [...settings.characters];
    if (characters.length < 2) throw new TypeError('Provide at least two ASCII characters.');
    const requested = Number.isFinite(settings.cellSize) ? settings.cellSize : 10;
    const cellSize = Math.max(4, requested, Math.sqrt((width * height) / 12000 / 0.6));
    const columns = Math.max(1, Math.floor(width / (cellSize * 0.6)));
    const rows = Math.max(1, Math.floor(height / cellSize));
    canvas.width = columns;
    canvas.height = rows;
    context.drawImage(image, 0, 0, columns, rows);
    // Reading pixels requires same-origin data or a CORS-enabled image.
    const pixels = context.getImageData(0, 0, columns, rows).data;
    const lines: string[] = [];
    for (let row = 0; row < rows; row++) {
      let line = '';
      for (let column = 0; column < columns; column++) {
        const offset = (row * columns + column) * 4;
        const alpha = pixels[offset + 3] / 255;
        const brightness =
          (0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2]) *
            alpha +
          255 * (1 - alpha);
        const index = Math.round((1 - brightness / 255) * (characters.length - 1));
        line += characters[settings.invert ? characters.length - 1 - index : index];
      }
      lines.push(line);
    }
    output.style.setProperty('--t-image-ascii-font', `${cellSize}px/${cellSize}px monospace`);
    output.textContent = lines.join('\n');
  });
  return {
    ...effect,
    update(next) {
      settings = { ...settings, ...next };
      effect.refresh();
    },
  };
}
