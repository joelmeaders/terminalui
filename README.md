# Terminal Kit

A browser component library built with Lit. All 50 components share six terminal-inspired palettes and work in plain HTML, React, Vue, and Angular. Storybook contains API notes, interactive controls, component states, and browser interaction tests. The package includes typed framework adapters, generated editor metadata, optional icon providers, and an installable local tarball.

## Run locally

Requires npm and Node 22.22.3+, Node 24.15+, or Node 26 within those major versions. Tested with Node 24.18. The Angular adapter build uses TypeScript 6.0 and Angular 22.1.

```sh
npm ci
npx playwright install chromium firefox webkit
npm run build
npm run dev
```

The workbench is at **http://127.0.0.1:5173**. In another terminal:

```sh
npm run storybook
```

Storybook is at **http://127.0.0.1:6006**. The workbench's documentation links point there during development.

## Components

| Element               | Purpose                          | Main API                                                                                  |
| --------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| `t-button`            | Action and form button           | `variant`, `size`, `disabled`, `loading`, `type`, `name`, `value`, `form`, native `click` |
| `t-input`             | Text and numeric input           | `value`, `name`, `label`, `type`, `required`, `readonly`, `disabled`, `help`, `error`     |
| `t-select`            | Native select                    | `options` property, `value`, `name`, `label`, `required`, `disabled`                      |
| `t-checkbox`          | Checkbox or switch               | `checked`, `switch`, `value`, `name`, `label`, `required`, `disabled`                     |
| `t-textarea`          | Multiline input                  | `value`, `rows`, `readonly`, `resize`, `minlength`, `maxlength`                           |
| `t-radio-group`       | Single-choice field              | `options`, `value`, `orientation`, `label`                                                |
| `t-range`             | Numeric slider                   | String `value`, `min`, `max`, `step`, `showValue`                                         |
| `t-switch`            | Boolean toggle                   | `checked`, `value`, `name`, `label`, `required`, `disabled`                               |
| `t-combobox`          | Searchable choice                | `options`, `value`, `placeholder`, `loading`, `emptyMessage`                              |
| `t-file-input`        | Native file picker               | `files`, `accept`, `multiple`, `capture`, `name`, `label`                                 |
| `t-card`              | Content panel                    | Default, `heading`, and `footer` slots                                                    |
| `t-badge`             | Text status                      | `variant`, default slot                                                                   |
| `t-alert`             | Inline notice                    | `variant`, `dismissible`, `urgent`, `t-dismiss`                                           |
| `t-progress`          | Native progress                  | `label`, `value`, `max`; omit value for indeterminate                                     |
| `t-accordion`         | Native disclosure                | `label`, `open`, `t-toggle` with `detail.open`                                            |
| `t-tabs`              | Keyboard-operated tabs           | `tabs` property, `active`, `label`, named slots, `t-change` with `detail.value`           |
| `t-dialog`            | Modal dialog                     | `heading`, `open`, `show(opener?)`, `close()`, `t-close`                                  |
| `t-tooltip`           | Help button and tooltip          | `label`, `message`; focus, hover, click, and Escape                                       |
| `t-menu`              | Action menu                      | `label`, `options`, `open`, `disabled`, `t-select`                                        |
| `t-breadcrumb`        | Navigation path                  | `items`, `label`                                                                          |
| `t-pagination`        | Page navigation                  | `page`, `total`, `pageSize`, `label`, `disabled`, `t-change`                              |
| `t-table`             | Sortable native table            | `columns`, `rows`, `caption`, `sortKey`, `sortDirection`, `selectedKeys`, `loading`       |
| `t-drawer`            | Modal side panel                 | `heading`, `open`, `placement`, `show(opener?)`, `close()`                                |
| `t-tree`              | Hierarchical navigation          | `items`, `value`, `expandedIds`, `label`                                                  |
| `t-icon`              | Built-in or registered SVG icon  | `name`, `label`, `size`                                                                   |
| `t-icon-button`       | Icon action                      | `name`, `label`, `size`, `pressed`, `disabled`                                            |
| `t-spinner`           | Loading indicator                | `label`, `size`, `type`, `steps`                                                          |
| `t-skeleton`          | Loading placeholder              | `shape`, `animated`                                                                       |
| `t-divider`           | Content separator                | `vertical`                                                                                |
| `t-avatar`            | Image or initials                | `name`, `src`, `size`                                                                     |
| `t-toast`             | Dismissible notification         | `duration`, `countdown`, `countdownUnit`, `show(message?, opener?)`, `close()`            |
| `t-empty-state`       | Empty content panel              | `heading`, default and action slots                                                       |
| `t-stack`             | Flex layout                      | `direction`, `align`, `justify`, `wrap`                                                   |
| `t-grid`              | Grid layout                      | `columns`, default slot                                                                   |
| `t-popover`           | Interactive floating panel       | `label`, `heading`, `open`, `disabled`, `placement`, `show()`, `close()`                  |
| `t-password-input`    | Password with visibility control | String `value`, `revealed`, `t-visibility-change`                                         |
| `t-number-input`      | Number with step buttons         | String `value`, `min`, `max`, `step`, `stepUp()`, `stepDown()`                            |
| `t-segmented-control` | Segmented radio choices          | `label`, `options`, `value`, `disabled`                                                   |
| `t-rating`            | Native radio rating              | String `value`, `max`, `clearable`, `clear()`                                             |
| `t-tags-input`        | Multiple text values             | `values`, JSON string `value`, `name`, `required`                                         |
| `t-color-picker`      | Native color input and hex field | `value`, named `swatches`, `required`, `disabled`                                         |
| `t-command-palette`   | Modal command search             | `commands`, `query`, `heading`, `loading`, `show()`, `close()`, `t-select`                |
| `t-steps`             | Ordered step navigation          | `items`, `value`, `orientation`, `t-select`                                               |
| `t-timeline`          | Ordered event history            | `items`, `label`, `emptyText`                                                             |
| `t-meter`             | Native scalar measurement        | `value`, `min`, `max`, `low`, `high`, `optimum`, `valueText`                              |
| `t-description-list`  | Semantic term/value pairs        | `items`, `label`                                                                          |
| `t-link`              | Native navigation link           | `href`, `target`, `rel`, `download`, default slot                                         |
| `t-toolbar`           | Arrow-key action group           | `label`, `orientation`, slotted buttons and links                                         |
| `t-split-pane`        | Resizable two-pane layout        | `size`, `min`, `max`, `step`, `orientation`, `stackAt`, named slots                       |
| `t-copy-button`       | Clipboard action and status      | `value`, `label`, `disabled`, `t-copy`, `t-copy-error`                                    |

The input supports text, numeric, and native date/time types with browser constraint validation. Date/time interfaces follow the browser. The kit does not include a custom calendar or rich-text editor. File selection uses `t-file-input`; it does not upload files. Tables provide local sorting and selection without virtualization or editable cells.

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

The package remains private and unpublished at version `0.1.0`, with `UNLICENSED` metadata pending an owner-approved license. To install it in another repository, run `npm pack` here, then `npm install /path/to/terminal-kit-core-0.1.0.tgz` there. Importing the package root registers all 50 elements. Individual imports include only their component dependencies. Use one distribution path per page: do not load the standalone bundle and ESM package together.

The build also creates TypeScript declarations, a Custom Elements Manifest, a component catalog, and VS Code HTML metadata. Storybook reads the generated manifest. See [framework integration](docs/frameworks.md) for editor configuration and [release preparation](docs/releasing.md) for package verification and publication boundaries.

## Forms and events

All 15 form controls use `ElementInternals` to participate in HTML forms. They support FormData, browser validation, disabled fieldsets, and reset. Give each field a `name` for submission and a `label` for its internal native control. Reset restores the initial value or checked state and clears file selection. Set initial property values before the first render when using framework bindings. Tags expose a `values` array and a JSON string `value`; FormData contains one entry per tag under the same name. Number and rating values are strings.

Use Terminal Kit or native submit and reset buttons:

```html
<form>
  <t-input name="email" label="Email" type="email" required></t-input>
  <t-button type="submit" name="action" value="save">Save</t-button>
  <t-button type="reset" variant="secondary">Reset</t-button>
</form>
```

`t-button` defaults to `type="button"`. Set `type="submit"` or `type="reset"` for form actions. Its `form` attribute can target an external form. Submission runs validation and includes the activated submit button's name and value. Enter in `t-input` follows the form's first submit button, including disabled-button blocking.

Fields emit bubbling, composed `input` and `change` events. Read `event.target.value`, `event.target.checked`, or `event.target.files`. Range values are strings. Programmatic property changes update the display without emitting an input event. Await `element.updateComplete` when a script must read the updated DOM or form state immediately after setting properties. Use `setCustomValidity()`, `checkValidity()`, and `reportValidity()` for browser validation.

Set arrays such as `options`, `tabs`, `items`, `columns`, and `rows` as JavaScript properties. Pass new arrays when changing their contents. Slot names must match unique tab IDs.

```js
select.options = [{ value: 'web', label: 'Website' }];
select.value = 'web';
dialog.show(openButton); // Explicit opener also handles pointer activation in WebKit.
toast.show('Settings saved.', saveButton); // Optional opener for focus return after dismissal.
```

Spinners support ten styles through `type`: `ring` (default), `dots`, `bars`, `pulse`, `orbit`, `cursor`, `cursor-box`, `arrow`, `pixels`, and `blocks`. The arrow uses six or eight fixed positions with `steps="6|8"`. All styles inherit theme colors and respect motion preferences. See the [spinner guide](docs/spinners.md) for sizes, styling, status labels, and examples.

Notification countdowns share the auto-dismiss timer:

```html
<t-toast duration="5000" countdown="bar" message="Settings saved."></t-toast>
<t-toast
  duration="5000"
  countdown="spinner"
  countdown-unit="seconds"
  message="Settings saved."
></t-toast>
<t-toast
  duration="5000"
  countdown="spinner"
  countdown-unit="milliseconds"
  message="Settings saved."
></t-toast>
```

Call `show()` or set `open` to display a notification. `duration` uses milliseconds. Its default of `0` keeps the notification open. `countdown` defaults to `none`, which hides the indicator without changing the timeout. `countdownUnit` controls the spinner text and defaults to `seconds`. Seconds round up, so zero coincides with dismissal. Millisecond text updates about every 32 ms, subject to browser scheduling. The timer uses elapsed time, not the number of display updates. Positive delays above 2,147,483,647 ms are capped at that browser timer limit. Negative or non-finite durations remain persistent.

Hover, keyboard focus, and a hidden page pause both the timer and its indicator. Changing `message` or `duration`, or calling `show()` again, restarts the duration. Changing the countdown style or unit keeps the remaining time. Reduced motion and `data-motion="off"` stop spinner rotation and limit countdown updates to once per second. Countdown visuals stay outside the live region. Critical messages should stay persistent or remain available elsewhere. In the workbench, use **Quick settings** to choose the countdown style, unit, and duration before selecting **Show notification**.

## Framework examples

Run `npm run build`, then `npm run dev` to try these examples:

| Environment            | URL                      | Source                                                                               |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| Plain HTML/JS          | `/examples/plain.html`   | [Plain HTML](examples/plain.html)                                                    |
| React                  | `/examples/react.html`   | [React](examples/react.ts)                                                           |
| Vue                    | `/examples/vue.html`     | [Vue](examples/vue.ts)                                                               |
| Angular reactive forms | `/examples/angular.html` | [Angular](examples/angular.ts), [value accessor](examples/angular-value-accessor.ts) |

The examples consume the built package. Browser tests check property updates, input events, checked state, disabled state, and application reset. Angular tests also check touched state. Framework dependencies are optional peers and development dependencies. They remain outside the core and standalone bundles.

React 19 uses typed wrappers from `@terminal-kit/core/react`, generated for every catalog element with `@lit/react`. The wrappers forward properties, refs, and native events. Custom events use names such as `onTSelect` and `onTClose`.

Vue 3 uses `useTerminalModel` from `@terminal-kit/core/vue` to bind typed refs to element properties and events. For Vue SFC templates, configure `isCustomElement` for tags starting with `t-`. Use property binding for arrays and objects.

Angular 22 uses `CUSTOM_ELEMENTS_SCHEMA` and the compiled `TerminalValueAccessor` from `@terminal-kit/core/angular`. The accessor supports reactive and template-driven bindings for all 15 controls. The package check compiles an external Angular AOT consumer. The included Vite application uses JIT for its application template. Angular validators and browser validation remain separate concerns. See [framework integration](docs/frameworks.md) for complete setup and examples.

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

Scanlines use one static texture behind the content of a `.t-screen` surface. Their color follows the palette accent unless you set `--t-scanline-color`. The surface creates a positioning and stacking context without clipping tooltips or focus outlines. Opaque child surfaces cover the texture, which protects control interiors from color blending. Nested screens do not add another texture when an ancestor screen already has one. An inner `data-scanlines="off"` cannot erase a visible ancestor backdrop; give clear content an opaque background or place it outside that screen.

The existing `data-effects="crt"` attribute remains a convenience preset for subtle glow and scanlines. On the document root it uses a fixed backdrop inside the body. On `.t-screen` it applies to that region. Both now paint behind content; earlier foreground overlays reduced text contrast. Explicit `data-glow` and `data-scanlines` values override the preset. Prefer the independent settings for new integrations.

For custom styling, adjust the public variables in your own selector or inline style:

| Variable               | Standard/off value      | Bold/subtle value             |
| ---------------------- | ----------------------- | ----------------------------- |
| `--t-line-width`       | `1px`                   | `2px`                         |
| `--t-divider-width`    | `1px`                   | `2px`                         |
| `--t-emphasis-width`   | `3px`                   | `4px`                         |
| `--t-selection-width`  | `2px`                   | `3px`                         |
| `--t-glow-blur`        | `0px`                   | `5px` (strong: `9px`)         |
| `--t-glow-strength`    | `0%`                    | `22%` (strong: `40%`)         |
| `--t-scanline-opacity` | No texture              | `0.06` (pronounced: `0.12`)   |
| `--t-scanline-width`   | `1px`                   | `1px` (pronounced: `2px`)     |
| `--t-scanline-color`   | Palette accent fallback | Custom CSS color, if supplied |
| `--t-scanline-spacing` | `4px`                   | `4px`                         |

Variables beginning with `--_t-` are internal. Glow and scanlines turn off in forced-colors mode and with an increased-contrast preference. The effects do not animate. The default stripe opacity and width balance visibility with text contrast. Recheck composited text and control contrast when overriding colors or opacity.

Use `--t-control-border` for essential control boundaries. Each palette supplies a value tested against its background, surface, raised surface, and default scanline backgrounds. `--t-border` remains the decorative panel and divider color. Custom palettes must set both tokens; the fallback to `--t-border` supports older integrations but does not guarantee sufficient contrast.

The demo exposes **Bold lines** beside the palettes and **Display effects** below them. Display effects includes an immediate preview of palette-colored scanlines. Scanlines also apply to the calibration display and event log. Preferences persist locally; saved CRT preferences migrate automatically. **Reset display styles** restores standard lines and removes glow and scanlines, and follows device motion preferences while keeping palette and density.

## Icons and motion

Use built-in icons or register selected icons from Ionicons, Font Awesome Free, Lucide, Bootstrap Icons, Tabler, Heroicons, and Material Symbols. The registry accepts SVG, Ionicons data URIs, Font Awesome definitions, Lucide nodes, and Iconify sets. It validates static SVG and rejects scripts, external resources, and animation elements. It performs no network loading. Provider packages are optional consumer dependencies; the core does not include those packs.

```ts
import '@terminal-kit/core/components/icon';
import { registerIcon } from '@terminal-kit/core/icons';
import { rocketOutline } from 'ionicons/icons';

registerIcon('ion:rocket', rocketOutline);
// <t-icon name="ion:rocket" label="Launch"></t-icon>
```

See [icon provider setup and licensing](docs/icons.md) for the other formats, selected-set imports, and provider notices. `t-icon-button` uses the same registry. Give icon-only actions a specific `label`; decorative icons need no label.

Controls use short state transitions. Overlays use finite entrance effects, while loading indicators can repeat during work. Device reduced-motion preferences disable these effects. Set `data-motion="off"` on a page or subtree to disable them explicitly, or `auto` to follow the device. Focus, closing, and form actions remain immediate. See [motion settings and tokens](docs/motion.md).

The local size check measures about 7.9 KB gzip for one button, 9.3 KB for the original three form controls, and 39.5 KB for registration of all 50 components. One selected Ionicons example, its registry, and `t-icon` measure about 10.7 KB. These figures include Lit and exclude theme CSS and fonts. Six-theme CSS is about 2.1 KB gzip. The complete-catalog budget is 42 KB after this expansion; the original 8 KB button and 9.5 KB form budgets remain unchanged. Importing and using more exported APIs adds their code.

## Storybook and verification

Storybook includes stories for all 50 components, introductions, appearance examples, and application patterns. Its toolbar changes palette, density, line weight, glow, screen scanlines, and motion. Appearance stories also demonstrate local overrides and the CRT preset. Docs describe slots, events, CSS parts, and form behavior. Stories include interaction checks, and the accessibility addon is configured to fail tests on detected violations.

```sh
npm run build
npm run typecheck
npm test                 # Chromium, Firefox, WebKit; components and framework examples
npm run test:a11y        # Contrast, forms, reflow, simulated text enlargement and spacing
npm run test:stories     # Storybook + Vitest in Chromium, including accessibility checks
npm run test:production  # Builds combined site and tests compiled demo/Storybook
npm run test:package     # External tarball install, types, adapters, Angular AOT, registration
npm run size            # Raw, gzip, and Brotli bytes, including Lit
npm run format:check
```

`npm run check` runs the full validation sequence. No tests contact application backends or alter external data.

The package check installs the tarball into an external temporary consumer. It checks strict NodeNext types, individual exports, framework isolation, Angular AOT compilation, and standalone registration. The size check retains separate budgets for one button, the original three form controls, and the complete catalog. CI configuration runs browser and package checks on Linux and production screenshot checks on Windows. A configured workflow does not establish a remote CI result.

Production tests compare saved screenshots for all six palettes, a mobile layout, a modal dialog, and selected display styles. Component-area references include the accessibility contrast corrections; the original `base-components` images remain as historical references. Browser tests cover nested overrides, texture boundaries, persistence, forced colors, and accessibility with effects enabled. The committed reference images use Playwright Chromium on Windows. Review intentional visual changes before regenerating references with `npx playwright test --config playwright.production.config.ts --update-snapshots`. Other operating systems need their own reviewed reference images.

Accessibility requirements are part of [AGENTS.md](AGENTS.md). The [accessibility evidence and manual test guide](docs/accessibility.md) separates automated coverage from pending NVDA, VoiceOver, real zoom, and physical-device checks. A narrow viewport and injected font sizes do not establish real browser zoom or screen-reader support.

`npm run build:site` creates a combined static demo and Storybook in `demo-dist/`. `npm run preview` serves it locally. The core package output remains separate in `dist/`; consumers do not download Storybook.

## Supported scope

- Automated checks cover the shipped themes and representative interactions. Manual screen-reader validation remains pending. The library does not claim WCAG conformance.
- The kit requires modern browsers with custom elements, Shadow DOM, ElementInternals, native dialogs, and the Popover API. There are no legacy polyfills.
- Server rendering and hydration are not implemented. This is a browser component kit.
- React 19, Vue 3, and Angular 22 adapters have concrete consumer checks. Other framework versions and third-party form libraries require application-specific verification.
- Tooltips provide short, noninteractive help. Tooltips and popovers use viewport-aware placement with flipping and bounds adjustment during scrolling and resizing. Use a popover for interactive content.
- Tables support local sorting, loading, empty states, and row selection. The library does not provide a virtualized data grid, cell editing, rich-text editor, or custom date picker.
- The theme choice in the demo persists locally. The component package itself does not write to storage.
- Version `0.1.0` remains private and unpublished. Release checks and CI configuration are included, but publication needs an owner-approved license and explicit release authorization. See [release preparation](docs/releasing.md).
