# Image effects

Image effects work on native `<img>` elements. Import the optional stylesheet once, then place an image directly inside `.t-image-effect`. The image remains the accessible source; generated pixels and ASCII are decorative.

```js
import '@terminal-kit/core/themes.css';
import '@terminal-kit/core/image-effects.css';
```

```html
<span class="t-image-effect" data-image-scanlines="subtle" data-image-tint>
  <img src="/portrait.jpg" alt="Portrait of the spacecraft pilot" />
</span>
```

Set `data-image-scanlines` to `subtle` or `pronounced`, add or remove `data-image-tint`, or set `data-image-scaling="pixelated"` at runtime. These options need no JavaScript. Tint and ASCII text inherit the nearest `--t-accent`. Scanlines also inherit `--t-image-scanline-color`, `--t-image-scanline-opacity`, `--t-image-scanline-spacing`, and `--t-image-scanline-width`. These properties can be set on `html`, `body`, a region, or the wrapper. The nearest explicit value wins.

CSS `image-rendering: pixelated` only changes how an image scales. For actual pixel blocks at the image's current size, import the optional Canvas module:

```js
import { mountPixelation } from '@terminal-kit/core/image-pixelate';

const image = document.querySelector('#portrait');
const pixelation = mountPixelation(image, { pixelSize: 8 });
pixelation.update({ pixelSize: 12 });
pixelation.refresh(); // Use after changing the image's contents without a load event.
pixelation.destroy(); // Use when the view is removed.
```

For ASCII, import only its module:

```js
import { mountAscii } from '@terminal-kit/core/image-ascii';

const ascii = mountAscii(image, { cellSize: 10, characters: ' .:-=+*#%@' });
ascii.update({ invert: true });
ascii.destroy();
```

Mount one runtime effect per image. Destroy it before mounting a different one. Both modules wait for image loading and update after the image size or source changes. `update()` changes settings. `refresh()` is for image contents that change without a load event. Both modules can be imported from plain JavaScript, Angular, Vue, or React. Neither is in the main catalog bundle; importing one effect does not import the other.

ASCII reads image pixels. For a cross-origin URL, the image server must permit CORS and the `<img>` needs `crossorigin="anonymous"`. If Canvas cannot read it, the original image remains visible and the image emits `t-image-effect-error` with `{ type, error }` in `detail`. Pixelation does not read pixels and can display a cross-origin image without CORS.

Keep meaningful `alt` text on the original image. Use `alt=""` only when the image is decorative. Generated output is hidden from assistive technology, and the effects are disabled in forced colors and increased contrast. Effects are static and do not flash or animate. Test each tinted image against its surrounding text and controls; an effect must not carry meaning by color or texture alone.
