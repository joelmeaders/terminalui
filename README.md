# Terminal Kit

A Lit proof of concept for normal websites and applications. Twelve general components share six terminal-inspired palettes. Storybook contains API notes, interactive controls, component states, and browser interaction tests.

## Run locally

Requires Node 22.12+ or Node 24 and npm. Tested with Node 24.

```sh
npm ci
npx playwright install chromium firefox webkit
npm run dev
```

The workbench is at **http://127.0.0.1:5173**. In another terminal:

```sh
npm run storybook
```

Storybook is at **http://127.0.0.1:6006**. The workbench's documentation links point there during development.

## Components

| Element       | Purpose                 | Main API                                                                              |
| ------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| `t-button`    | Action button           | `variant`, `size`, `disabled`, `loading`, native `click`                              |
| `t-input`     | Text and numeric input  | `value`, `name`, `label`, `type`, `required`, `readonly`, `disabled`, `help`, `error` |
| `t-select`    | Native select           | `options` property, `value`, `name`, `label`, `required`, `disabled`                  |
| `t-checkbox`  | Checkbox or switch      | `checked`, `switch`, `value`, `name`, `label`, `required`, `disabled`                 |
| `t-card`      | Content panel           | Default, `heading`, and `footer` slots                                                |
| `t-badge`     | Text status             | `variant`, default slot                                                               |
| `t-alert`     | Inline notice           | `variant`, `dismissible`, `urgent`, `t-dismiss`                                       |
| `t-progress`  | Native progress         | `label`, `value`, `max`; omit value for indeterminate                                 |
| `t-accordion` | Native disclosure       | `label`, `open`, `t-toggle` with `detail.open`                                        |
| `t-tabs`      | Keyboard-operated tabs  | `tabs` property, `active`, `label`, named slots, `t-change` with `detail.value`       |
| `t-dialog`    | Modal dialog            | `heading`, `open`, `show(opener?)`, `close()`, `t-close`                              |
| `t-tooltip`   | Help button and tooltip | `label`, `message`; focus, hover, click, and Escape                                   |

The input supports `text`, `email`, `password`, `search`, `tel`, `url`, and `number`. Other types fall back to text. This starter does not implement date, file, or rich-text controls.

## Use in plain HTML

Build the kit:

```sh
npm run build
```

Serve this markup over HTTP:

```html
<link rel="stylesheet" href="./dist/themes.css" />
<script type="module" src="./dist/terminal.js"></script>

<section data-theme="phosphor">
  <t-button variant="secondary">Initialize</t-button>
  <t-input label="Workspace" name="workspace" required></t-input>
</section>
```

The browser bundle includes Lit. It needs no import map or consumer build step. See [examples/plain.html](examples/plain.html) for a working form.

For a bundler, import individual components and the theme CSS:

```ts
import '@terminal-kit/core/components/input';
import '@terminal-kit/core/components/button';
import '@terminal-kit/core/themes.css';
```

The package is private and is not published to npm. These imports work through package self-reference in the included examples. Use a local package dependency when trying it in another repository. Importing the package root registers all twelve elements. Individual imports keep unrelated components out of the consuming build. Use one distribution path per page: do not load the standalone bundle and ESM package together.

## Forms and events

`t-input`, `t-select`, and `t-checkbox` use `ElementInternals` to participate in HTML forms. They support FormData, required validation, disabled fieldsets, and reset. Give each field a `name` for submission and a `label` for its internal native control. Text/select reset values come from their `value` attributes. A checkbox's initial `checked` attribute determines its reset state.

Use native submit and reset buttons:

```html
<form>
  <t-input name="email" label="Email" type="email" required></t-input>
  <button class="t-native" type="submit">Save</button>
  <button class="t-native" type="reset">Reset</button>
</form>
```

`t-button` is an action button. It does not impersonate a form submitter. Pressing Enter in `t-input` activates the form's first enabled submit button.

Fields emit bubbling, composed `input` and `change` events. Read `event.target.value` or `event.target.checked`. Programmatic property changes update the display without emitting an input event. Await `element.updateComplete` when a script must read the updated DOM or form state immediately after setting properties.

Set `options` and `tabs` as JavaScript properties. Pass new arrays when changing their contents. Slot names must match unique tab IDs.

```js
select.options = [{ value: 'web', label: 'Website' }];
select.value = 'web';
dialog.show(openButton); // Explicit opener also handles pointer activation in WebKit.
```

## Framework examples

Run `npm run build`, then `npm run dev` to try these examples:

| Environment            | URL                      | Source                                                                               |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| Plain HTML/JS          | `/examples/plain.html`   | [Plain HTML](examples/plain.html)                                                    |
| React                  | `/examples/react.html`   | [React](examples/react.ts)                                                           |
| Vue                    | `/examples/vue.html`     | [Vue](examples/vue.ts)                                                               |
| Angular reactive forms | `/examples/angular.html` | [Angular](examples/angular.ts), [value accessor](examples/angular-value-accessor.ts) |

The examples consume the built package. Browser tests check property updates into the component and input events back into the framework. Frameworks are development dependencies only. They are not shipped in the kit.

React uses its native custom-element support. The example uses `createElement` so it does not need project-wide JSX declarations. A published React wrapper with richer typing is future work.

The Vue example uses render functions. For Vue SFC templates, configure the Vue compiler's `isCustomElement` option for tags starting with `t-`. Bind values explicitly and listen for `input`; do not assume component-style `v-model` works without an adapter.

Angular uses `CUSTOM_ELEMENTS_SCHEMA`. The small `ControlValueAccessor` example connects `t-input` to reactive forms. It is a source example, not a complete Angular adapter package. Angular validators and custom-element native validation remain separate concerns.

## Themes and styling

Palettes: `amber`, `phosphor`, `ice`, `lunar`, `signal`, and `paper`. Apply `data-theme` to the document or a subtree. CSS variables inherit through Shadow DOM. The theme file also provides a `.t-native` class for ordinary HTML controls.

```css
[data-theme='custom'] {
  --t-bg: #101820;
  --t-surface: #18242e;
  --t-text: #edf4f6;
  --t-accent: #8edbe9;
  --t-on-accent: #11232a;
  --t-focus: #ccf7ff;
}
```

The complete token set is in [src/themes.css](src/themes.css). Use documented CSS parts for targeted changes, for example `t-card::part(body)`. Fonts use local system fallbacks, with no external font downloads.

### Display styles

Appearance settings are independent. Omitting them preserves the base appearance.

| Setting          | Values                                  | Scope                                |
| ---------------- | --------------------------------------- | ------------------------------------ |
| `data-theme`     | The six palettes above                  | Page, subtree, or component          |
| `data-lines`     | `standard` (default), `bold`            | Inherited borders and dividers       |
| `data-glow`      | `off` (default), `subtle`, `strong`     | Inherited text and surface glow      |
| `data-density`   | `comfortable` (default), `compact`      | Inherited spacing and control height |
| `data-scanlines` | `off` (default), `subtle`, `pronounced` | One explicit `.t-screen` region      |

```html
<main data-theme="phosphor" data-lines="bold" data-glow="subtle">
  <t-button>Initialize</t-button>
  <section class="t-screen" data-scanlines="subtle">
    <t-card>System telemetry</t-card>
  </section>
  <section data-lines="standard" data-glow="off">
    <t-input label="Clear editing area"></t-input>
  </section>
</main>
```

Change an attribute to update the display. This needs no JavaScript configuration service, framework adapter, or component re-render. Line and glow settings also work on individual custom elements and `.t-native` controls. A nested palette supplies its own glow color. Focus outlines remain distinct from decorative borders.

Scanlines use one static overlay on the `.t-screen` surface. The surface creates a positioning and stacking context, but does not clip overflowing tooltips or focus outlines. The overlay stays within its bounds and does not intercept pointer input. Nested screens do not add another overlay when an ancestor screen already has texture. An inner `data-scanlines="off"` cannot erase its ancestor's overlay; place clear content outside that screen. Native modal dialogs appear above screen overlays.

The existing `data-effects="crt"` attribute remains a convenience preset for subtle glow and scanlines. On the document root it retains a viewport overlay. On `.t-screen` it applies to that region. Explicit `data-glow` and `data-scanlines` values override the preset. Prefer the independent settings for new integrations.

For custom styling, adjust the public variables in your own selector or inline style:

| Variable               | Standard/off value | Bold/subtle value            |
| ---------------------- | ------------------ | ---------------------------- |
| `--t-line-width`       | `1px`              | `2px`                        |
| `--t-divider-width`    | `1px`              | `2px`                        |
| `--t-emphasis-width`   | `3px`              | `4px`                        |
| `--t-selection-width`  | `2px`              | `3px`                        |
| `--t-glow-blur`        | `0px`              | `5px` (strong: `9px`)        |
| `--t-glow-strength`    | `0%`               | `22%` (strong: `40%`)        |
| `--t-scanline-opacity` | No overlay         | `0.045` (pronounced: `0.09`) |
| `--t-scanline-spacing` | `4px`              | `4px`                        |

Variables beginning with `--_t-` are internal. Glow and scanlines turn off in forced-colors mode. The effects do not animate. Review text contrast and focus visibility when creating custom presets.

The demo exposes **Bold lines** beside the palettes and **Display effects** below them. Scanlines apply to the calibration display and event log. Preferences persist locally; saved CRT preferences migrate automatically. **Reset display styles** restores standard lines and removes glow and scanlines while keeping palette and density.

## Storybook and verification

Storybook includes 49 stories across all twelve components, introductions, appearance examples, and a complete form pattern. Its toolbar changes palette, density, line weight, glow, and screen scanlines. Appearance stories also demonstrate local overrides and the CRT preset. Docs describe slots, events, CSS parts, and form behavior. Stories include interaction checks, and the accessibility addon is configured to fail tests on detected violations.

```sh
npm run typecheck
npm run build
npm test                 # Chromium, Firefox, WebKit; components and framework examples
npm run test:stories     # Storybook + Vitest in Chromium, including accessibility checks
npm run test:production  # Builds combined site and tests compiled demo/Storybook
npm run size            # Raw, gzip, and Brotli bytes, including Lit
npm run format:check
```

`npm run check` runs the full validation sequence. No tests contact application backends or alter external data.

Production tests compare saved screenshots for all six palettes, a mobile layout, a modal dialog, and selected display styles. Separate component-area references preserve the original appearance at desktop and mobile sizes. Browser tests cover nested overrides, texture boundaries, persistence, forced colors, and accessibility with effects enabled. The committed reference images use Playwright Chromium on Windows. Review intentional visual changes before regenerating references with `npx playwright test --config playwright.production.config.ts --update-snapshots`. Other operating systems need their own reviewed reference images.

`npm run build:site` creates a combined static demo and Storybook in `demo-dist/`. `npm run preview` serves it locally. The core package output remains separate in `dist/`; consumers do not download Storybook.

## POC boundaries

- Automated checks cover the shipped themes and representative interactions. Manual screen-reader certification is not complete. Do not describe this POC as WCAG certified.
- The kit targets modern browsers with custom elements, Shadow DOM, ElementInternals, and native dialog support. There are no legacy polyfills.
- Server rendering and hydration are not implemented. This is a browser component kit.
- Framework examples prove basic integration. Comprehensive adapter packages, framework SSR, and every form-library combination remain future work.
- Tooltips provide short, noninteractive help and use simple positioning. Collision-aware placement is not implemented.
- The theme choice in the demo persists locally. The component package itself does not write to storage.
- Package publication, release automation, and hosted deployment are outside this local proof of concept.
