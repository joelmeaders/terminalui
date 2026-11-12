# Framework integration

The core uses Lit and browser custom elements. The package also offers optional adapters for frameworks.
Install `@joelmeaders/hullframe` from GitHub Packages. First sign in with your GitHub username and a classic personal access token with `read:packages` permission:

```sh
npm login --scope=@joelmeaders --auth-type=legacy --registry=https://npm.pkg.github.com
npm install @joelmeaders/hullframe
```

Registry installation requires a published Hullframe release. Before the first publication, or for local development, install a tarball, an archive containing the package:

```sh
npm run build
npm pack
npm install /path/to/joelmeaders-hullframe-0.1.3.tgz
```

When migrating from `@joelmeaders/terminalui`, replace the dependency and all import prefixes. The `t-*` elements and events, `T*` component and React wrapper names, and CSS names remain unchanged. See the [rename and migration notes](https://github.com/joelmeaders/terminalui#migrating-to-hullframe).

Import the theme stylesheet once. Apply `data-theme="amber"` to `html` or a parent container.
Import component modules before rendering their elements. Choose either the standalone bundle or component imports for a page. Both register the same element names, so do not use them together.

## Plain HTML

Copy `dist/hullframe.js` and `dist/themes.css` to your public assets.
No package manager, framework, or import map is required in the browser.

```html
<link rel="stylesheet" href="/assets/themes.css" />
<script type="module" src="/assets/hullframe.js"></script>
<form>
  <t-input name="name" label="Name" required></t-input>
  <t-button type="submit">Save</t-button>
</form>
```

With a bundler, use `import '@joelmeaders/hullframe/components/input'` for individual elements.
Use `import '@joelmeaders/hullframe'` for the entire catalog. Both imports include element registration.
Set object and array properties with JavaScript. A boolean HTML attribute is true when it is present. For example, `disabled="false"` still disables a control.

## React 19

Install `react` and `@lit/react`. Import typed wrappers from per-component paths such as `@joelmeaders/hullframe/react/input`.
Each path includes that wrapper and the elements it needs. The wrapper passes properties, refs, children, and native event listeners to the element.
The existing `@joelmeaders/hullframe/react` barrel remains compatible. Bundlers that honor package side-effect metadata can also remove its unused wrappers.
Per-component paths keep the module graph focused in development and native ESM as well. Use `@joelmeaders/hullframe` when you need to register the complete element catalog.
The official [Lit React adapter](https://lit.dev/docs/frameworks/react/) supplies this behavior.

```tsx
import { useState } from 'react';
import { TInput } from '@joelmeaders/hullframe/react/input';
import type { TInput as InputElement } from '@joelmeaders/hullframe/components/input';
import '@joelmeaders/hullframe/themes.css';

export function Settings() {
  const [name, setName] = useState('Operator');
  return (
    <TInput
      label="Name"
      value={name}
      onInput={(event) => setName((event.target as InputElement).value)}
    />
  );
}
```

Use `checked` for checkbox and switch state. Use `onTSelect`, `onTChange`, `onTClose`, and similar names for `t-*` events.
Custom event handlers infer the types of the event data described in the component guide. Nested menu options, tree items, commands, numeric values, and literal states retain their types. Events without a payload have `detail: null`. Native `input` and `change` handlers receive `Event`; read the value from their typed element target.

```tsx
import { TMenu } from '@joelmeaders/hullframe/react/menu';

export function FileActions() {
  return (
    <TMenu
      label="File actions"
      options={[{ value: 'open', label: 'Open report' }]}
      onTSelect={(event) => {
        // value is string; option is MenuOption. No event cast is needed.
        console.log(event.detail.value, event.detail.option.label);
      }}
    />
  );
}
```

These bindings do not support React server rendering or hydration. Render this library inside a browser client boundary.
The examples assume a client bundler that accepts CSS imports, such as Vite. With Vite and TypeScript, include `vite/client` in your application's types so local CSS imports are recognized.

## Vue 3

Register the required component imports. In Vue's compiler configuration, identify tags with
`isCustomElement: (tag) => tag.startsWith('t-')`. For Vite, set this option under
`vue({ template: { compilerOptions: { isCustomElement } } })`.

`useHullframeModel` binds a typed Vue ref to an element property. It removes listeners when the element changes or the component unmounts.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useHullframeModel } from '@joelmeaders/hullframe/vue';
import { TInput } from '@joelmeaders/hullframe/components/input';
import '@joelmeaders/hullframe/themes.css';
const element = ref<TInput | null>(null);
const name = ref('Operator');
useHullframeModel(element, name, 'value');
</script>
<template><t-input ref="element" label="Name" /></template>
```

Use property `checked` with boolean refs, `files` with `FileList | null` refs, or `values` with string-array refs for `t-multi-select`.
The fourth argument selects an event, such as `t-change` for tabs. The default is `input`.
For direct binding without the helper, use `:value.prop="name"` and an `@input` handler.
Use `.prop` for array/object values such as options, columns, and rows.

## Angular 22

Import `HullframeValueAccessor` from `@joelmeaders/hullframe/angular`, your forms module, and `CUSTOM_ELEMENTS_SCHEMA`.
The adapter uses Angular partial compilation. An Angular AOT consumer can link it through normal Angular tooling.
The package check compiles an external consumer with `ngc` and verifies generated component definitions.

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HullframeValueAccessor } from '@joelmeaders/hullframe/angular';
import '@joelmeaders/hullframe/components/input';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, HullframeValueAccessor],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: '<t-input label="Name" [formControl]="name"></t-input>',
})
export class Settings {
  name = new FormControl('Operator', { nonNullable: true });
}
```

The accessor connects all nineteen form controls to Angular forms. It supports `formControl`, `formControlName`, and `ngModel`.
Input, textarea, select, radio, range, combobox, password input, number input, segmented control, rating, tags input, color picker, date picker, date-range picker, and time picker use string values.
Checkboxes and switches use booleans. File inputs use `FileList | null`. Multi-select uses a `string[]` model and submits repeated entries under its form name.
Number inputs and ratings use numeric strings, not JavaScript numbers. Tags use a JSON array string, such as `'["alpha","beta"]'`.
The date-range picker uses one ISO interval string, such as `2026-09-24/2026-10-01`. Its `start` and `end` properties expose the two dates. Bind the form control to `value`.
The time picker uses one 24-hour `HH:mm` string, such as `09:30`. It has no date or timezone.
Use `new FormControl('["alpha"]', { nonNullable: true })` with `t-tags-input`; do not pass an array to this accessor.
It forwards input, touched, disabled, and application reset states.
Browser validity remains available through `checkValidity()` and `reportValidity()`.
Add Angular validators when your application requires Angular `FormControl.errors` to match browser constraints.

The Vite example loads `@angular/compiler` for its application template at runtime.
The library adapter itself is compiled with `ngc`, and the external package check also compiles an AOT application.
That consumer exercises model-to-element writes, element input events, touched state, and disabled state for the prior six added controls and array-valued multi-select.
Angular 22.1.7 requires TypeScript `>=6.0 <6.1`, as declared by its compiler peer dependency.
Use a supported Node version from [Angular's compatibility reference](https://angular.dev/reference/versions).

## Shared API terms

Use the same terms when configuring related controls. Existing property names remain supported.

| Term                           | Meaning and exceptions                                                                                                                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `size`                         | Named appearance sizes are `small`, `medium`, and `large` for buttons, icon buttons, avatars, chips, spinners, and meters. Most default to medium. Meter defaults to small to preserve its compact track. Icon size is pixels; split-pane size is a percentage. |
| `orientation`                  | Widget or pane direction is `horizontal` or `vertical`. Radio groups default to vertical; ratings and segmented controls default to horizontal. Stack uses flex `direction="row"` or `"column"`. Divider retains its `vertical` boolean.                        |
| `value`                        | A scalar field value or selected item ID. Number and rating fields use strings. Tabs retain `active` for the selected tab ID.                                                                                                                                   |
| `checked` / `values` / `files` | Boolean choice, multiple choices, or native file selection. The table and framework sections describe their model and submission types.                                                                                                                         |
| `disabled` / `readonly`        | Disabled fields cannot be edited and do not submit. Readonly fields submit their value. Only controls with a meaningful readonly operation expose it; disabling a choice is not a readonly substitute.                                                          |
| `emptyMessage` / `emptyText`   | Custom empty-state text. Combobox, menu, and multi-select use `emptyMessage`; table and timeline retain `emptyText`.                                                                                                                                            |
| `placement`                    | Drawer uses logical start/end edges. Floating content and dock use documented physical edges. RTL does not change a physical dock snap target.                                                                                                                  |

Replace array properties when their content changes. Give choices, steps, tabs, tree items, table rows, and dock items stable identifiers according to their component guide. Programmatic form-value updates do not emit user input events. Await `updateComplete` before reading the updated DOM or form state. A component must preserve a focus move that an application handler makes deliberately.

When moving registered elements into another same-origin document, load the theme styles in that document too. The library restores its static shadow styles and uses the owning document for interactions and cleanup. Arbitrary application-owned constructed stylesheets may be dropped by the browser on adoption; the library does not recreate them. The adoption fallback honors the target document's `window.litNonce`. This is not a complete strict-CSP compatibility claim.

## Editor metadata and verification

The build generates `custom-elements.json`, `catalog.json`, and `vscode.html-custom-data.json` in `dist`.
Storybook reads the manifest for component metadata. Configure VS Code with:

```json
{ "html.customData": ["./node_modules/@joelmeaders/hullframe/dist/vscode.html-custom-data.json"] }
```

Run `npm run build` after component API changes. The metadata and React exports derive from the component source.
Run `npm run test:package` to install a tarball in an external temporary directory and verify exported types and browser registration.
Run `npx playwright test tests/integrations.spec.ts` to test all four example applications across Chromium, Firefox, and WebKit.
