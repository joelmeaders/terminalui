# Framework integration

The core uses Lit and browser custom elements. Framework adapters are optional package exports.
The local package remains private and unpublished. Install a tarball until an owner approves a public release.

```sh
npm run build
npm pack
npm install /path/to/terminal-kit-core-0.1.0.tgz
```

Import the theme stylesheet once. Apply `data-theme="amber"` to `html` or a parent container.
Import component modules before rendering their elements. Do not mix the standalone bundle with component imports on one page.
Both formats register the same element names.

## Plain HTML

Copy `dist/terminal.js` and `dist/themes.css` to your public assets.
No package manager, framework, or import map is required in the browser.

```html
<link rel="stylesheet" href="/assets/themes.css" />
<script type="module" src="/assets/terminal.js"></script>
<form>
  <t-input name="name" label="Name" required></t-input>
  <t-button type="submit">Save</t-button>
</form>
```

With a bundler, use `import '@terminal-kit/core/components/input'` for individual elements.
Use `import '@terminal-kit/core'` for the entire catalog. Both imports include element registration.
Object and array properties require JavaScript assignment. Boolean HTML attributes use presence, so `disabled="false"` still disables a control.

## React 19

Install `react` and `@lit/react`. Import typed wrappers from `@terminal-kit/core/react`.
The wrapper export contains every catalog component. It forwards element properties, refs, children, and native event listeners.
The official [Lit React adapter](https://lit.dev/docs/frameworks/react/) supplies this behavior.

```tsx
import { useState } from 'react';
import { TInput, TCheckbox } from '@terminal-kit/core/react';
import type { TInput as InputElement } from '@terminal-kit/core/components/input';
import '@terminal-kit/core/themes.css';

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
Custom event details use `unknown` until you narrow them to the component's documented payload.
These bindings do not provide React server rendering or hydration. Render this library in a browser client boundary.
The examples assume a client bundler that accepts CSS imports, such as Vite. With Vite and TypeScript, include `vite/client` in your application's types so local CSS imports are recognized.

## Vue 3

Register the required component imports. In Vue's compiler configuration, identify tags with
`isCustomElement: (tag) => tag.startsWith('t-')`. For Vite, set this option under
`vue({ template: { compilerOptions: { isCustomElement } } })`.

`useTerminalModel` binds a typed Vue ref to an element property. It removes listeners when the element changes or the component unmounts.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useTerminalModel } from '@terminal-kit/core/vue';
import { TInput } from '@terminal-kit/core/components/input';
import '@terminal-kit/core/themes.css';
const element = ref<TInput | null>(null);
const name = ref('Operator');
useTerminalModel(element, name, 'value');
</script>
<template><t-input ref="element" label="Name" /></template>
```

Use property `checked` with boolean refs, `files` with `FileList | null` refs, or `values` with string-array refs for `t-multi-select`.
The fourth argument selects an event, such as `t-change` for tabs. The default is `input`.
For direct binding without the helper, use `:value.prop="name"` and an `@input` handler.
Use `.prop` for array/object values such as options, columns, and rows.

## Angular 22

Import `TerminalValueAccessor` from `@terminal-kit/core/angular`, your forms module, and `CUSTOM_ELEMENTS_SCHEMA`.
The adapter uses Angular partial compilation. An Angular AOT consumer can link it through normal Angular tooling.
The package check compiles an external consumer with `ngc` and verifies generated component definitions.

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TerminalValueAccessor } from '@terminal-kit/core/angular';
import '@terminal-kit/core/components/input';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, TerminalValueAccessor],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: '<t-input label="Name" [formControl]="name"></t-input>',
})
export class Settings {
  name = new FormControl('Operator', { nonNullable: true });
}
```

The accessor supports `formControl`, `formControlName`, and `ngModel` for all seventeen form controls.
Input, textarea, select, radio, range, combobox, password input, number input, segmented control, rating, tags input, color picker, and date picker use string values.
Checkboxes and switches use booleans. File inputs use `FileList | null`. Multi-select uses a `string[]` model and submits repeated entries under its form name.
Number inputs and ratings use numeric strings, not JavaScript numbers. Tags use a JSON array string, such as `'["alpha","beta"]'`.
Use `new FormControl('["alpha"]', { nonNullable: true })` with `t-tags-input`; do not pass an array to this accessor.
It forwards input, touched, disabled, and application reset states.
Browser validity remains available through `checkValidity()` and `reportValidity()`.
Add Angular validators when your application requires Angular `FormControl.errors` to match browser constraints.

The Vite example loads `@angular/compiler` for its application template at runtime.
The library adapter itself is compiled with `ngc`, and the external package check also compiles an AOT application.
That consumer exercises model-to-element writes, element input events, touched state, and disabled state for the prior six added controls and array-valued multi-select.
Angular 22.1.7 requires TypeScript `>=6.0 <6.1`, as declared by its compiler peer dependency.
Use a supported Node version from [Angular's compatibility reference](https://angular.dev/reference/versions).

## Editor metadata and verification

The build generates `custom-elements.json`, `catalog.json`, and `vscode.html-custom-data.json` in `dist`.
Storybook reads the manifest for component metadata. Configure VS Code with:

```json
{ "html.customData": ["./node_modules/@terminal-kit/core/dist/vscode.html-custom-data.json"] }
```

Run `npm run build` after component API changes. The metadata and React exports derive from the component source.
Run `npm run test:package` to install a tarball in an external temporary directory and verify exported types and browser registration.
Run `npx playwright test tests/integrations.spec.ts` to test all four example applications across Chromium, Firefox, and WebKit.
