# Cascading appearance

## Set a page default, then override a region

Import `@terminal-kit/core/themes.css` once. Set appearance attributes on `html`, `body`, a container, or a component. Each setting inherits independently through ordinary elements, slots, and component shadow roots. The nearest explicit setting wins for that region and its descendants. Removing an attribute restores inheritance.

```html
<html
  data-theme="phosphor"
  data-density="compact"
  data-lines="bold"
  data-glow="subtle"
  data-scanlines="pronounced"
  data-motion="auto"
>
  <body>
    <t-button>Use page settings</t-button>

    <section
      class="t-screen"
      data-theme="paper"
      data-density="comfortable"
      data-lines="standard"
      data-glow="off"
      data-scanlines="off"
    >
      <t-input label="Clear editing area"></t-input>
      <div data-theme="amber" data-density="compact">
        <t-button>Use this region's settings</t-button>
      </div>
    </section>
  </body>
</html>
```

The inner button uses amber colors and compact density. It retains standard lines and no glow or scanlines from the editing region. A palette change does not reset fonts, spacing, line weight, effect strength, or motion duration. A `body` setting overrides the matching setting on `html`.

## Independent settings

| Attribute        | Values                                                 | Page default  |
| ---------------- | ------------------------------------------------------ | ------------- |
| `data-theme`     | `amber`, `phosphor`, `ice`, `lunar`, `signal`, `paper` | `amber`       |
| `data-density`   | `comfortable`, `compact`                               | `comfortable` |
| `data-lines`     | `standard`, `bold`                                     | `standard`    |
| `data-glow`      | `off`, `subtle`, `strong`                              | `off`         |
| `data-scanlines` | `off`, `subtle`, `pronounced`                          | `off`         |
| `data-motion`    | `auto`, `off`                                          | `auto`        |
| `data-effects`   | `crt`, `off`                                           | No preset     |

Omit an attribute to inherit it. Use a listed value to override it. For example, `data-glow="off"` stops inherited glow. `data-motion="auto"` follows the device preference even inside a region with motion off. Device reduced motion always wins. Unrecognized values do not select a library setting.

`data-effects="crt"` supplies subtle glow and subtle scanlines at that level. `data-effects="off"` resets those two axes at that level. Explicit `data-glow` and `data-scanlines` values on the same element take precedence over the preset. The preset does not change theme, density, lines, or motion.

## Scanline settings and painted surfaces

Set `data-scanlines` on any ancestor. Descendant `.t-screen` surfaces use that setting without repeating the attribute. Setting scanlines or the CRT preset on `html` or `body` also paints a fixed page backdrop. A closer body setting controls that backdrop.

Each `.t-screen` is an isolated surface with an opaque background from `--t-bg`. This prevents nested textures from accumulating and lets an inner screen use weaker scanlines or turn them off. It also lets each nested palette tint its own texture. Texture stays behind content, does not clip focus rings, and cannot intercept input.

```html
<section data-scanlines="pronounced">
  <div class="t-screen">Inherited pronounced texture.</div>
  <div data-scanlines="off">
    <div class="t-screen">A clear surface.</div>
    <div class="t-screen" data-scanlines="subtle">Local subtle texture.</div>
  </div>
</section>
```

A plain transparent wrapper changes descendant settings but cannot erase an ancestor's already painted background. Use `.t-screen` for a visibly clear or differently textured region. Keep its background opaque when it must cover an outer texture. Override the screen background with `--t-screen-background` or ordinary `background-color` CSS. A transparent override deliberately exposes the outer backdrop.

Component surfaces, including card bodies and control interiors, retain their own backgrounds. They can cover the screen texture. The setting does not add a texture overlay to every element.

## Tokens and frameworks

Public CSS properties such as `--t-font`, `--t-space`, `--t-control-height`, and `--t-motion-fast` also inherit. Set them on an ancestor or a component. A nearer attribute can supply a new value for its own axis. Explicit component sizes still control that component's geometry.

```css
body {
  background: var(--t-bg);
  color: var(--t-text);
  --t-font: Consolas, monospace;
  --t-motion-fast: 100ms;
}
.reading-area {
  --t-space: 20px;
  --t-screen-background: var(--t-surface);
}
```

Palette attributes supply colors and the native light/dark color scheme. They do not style every ordinary HTML element. Import `typography.css` and use `.t-prose` for native text, or `.t-native` for native controls. Set the page's background and text color in application CSS as above.

The attributes are standard HTML in all supported frameworks. Use `className="t-screen"` in React and `class="t-screen"` in HTML, Vue, and Angular. For dynamic values, use `data-theme={theme}` in React, `:data-theme="theme"` in Vue, or `[attr.data-theme]="theme"` in Angular. A static page default can live in the application's HTML shell. No provider or settings service is required.

CSS tokens cross shadow roots. If an application renders its own settings or `.t-screen` markup inside a separate shadow root, load the stylesheet in that root too. Document selectors cannot match elements inside it. Popovers and dialogs inherit from their DOM ancestors while open in the browser's top layer. Content that an application moves to another DOM parent inherits from that new location.

## Accessibility preferences

Forced colors and increased contrast disable glow and scanlines even in nested regions that enable them. Device reduced motion disables animation even under `data-motion="auto"`. These preferences take priority over decorative settings.

Check contrast after custom colors, surfaces, or effect opacity changes. Keyboard operation and focus must remain available in every region. Automated inheritance and palette checks do not establish manual screen-reader or real OS preference support. See the project's accessibility evidence for those pending checks.
