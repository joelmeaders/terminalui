export interface ImageEffectController<Options> {
  /** Change settings and render the current image again. */
  update(options: Partial<Options>): void;
  /** Render again after changing the image source or its contents. */
  refresh(): void;
  /** Remove the generated image and all listeners. */
  destroy(): void;
}

export type ImageEffectType = 'pixelate' | 'ascii';

const active = new WeakSet<HTMLImageElement>();

/** Set up one decorative runtime effect without replacing the accessible image. */
export function connectImageEffect(
  image: HTMLImageElement,
  type: ImageEffectType,
  output: HTMLCanvasElement | HTMLPreElement,
  render: (width: number, height: number) => void,
) {
  const wrapper = image.parentElement;
  if (!wrapper?.classList.contains('t-image-effect') || image.parentElement !== wrapper) {
    throw new TypeError('Place the image directly inside a .t-image-effect wrapper.');
  }
  if (active.has(image)) {
    throw new Error('This image already has a runtime effect. Destroy it before adding another.');
  }
  active.add(image);
  output.dataset.tImageOutput = type;
  output.setAttribute('aria-hidden', 'true');
  wrapper.append(output);

  let frame = 0;
  let destroyed = false;
  const clear = () => wrapper.removeAttribute('data-image-effect-ready');
  const refresh = () => {
    if (destroyed || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
        clear();
        return;
      }
      const { width, height } = image.getBoundingClientRect();
      if (!width || !height) {
        clear();
        return;
      }
      try {
        render(width, height);
        wrapper.setAttribute('data-image-effect-ready', type);
      } catch (error) {
        clear();
        image.dispatchEvent(new CustomEvent('t-image-effect-error', { detail: { type, error } }));
      }
    });
  };
  const onSourceChange = () => {
    clear();
    refresh();
  };
  const resize = new ResizeObserver(refresh);
  resize.observe(image);
  const source = new MutationObserver(onSourceChange);
  source.observe(image, { attributes: true, attributeFilter: ['src', 'srcset', 'sizes'] });
  image.addEventListener('load', refresh);
  image.addEventListener('error', clear);
  refresh();

  return {
    refresh,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      source.disconnect();
      image.removeEventListener('load', refresh);
      image.removeEventListener('error', clear);
      clear();
      output.remove();
      active.delete(image);
    },
  };
}
