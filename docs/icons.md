# Icons and provider data

`t-icon` and `t-icon-button` use the same local registry, a list of icons stored by name. The core includes built-in icons and depends only on Lit. Packages from other icon providers are optional dependencies for your application or build. The registry makes no network requests. It does not download an icon when it sees a provider prefix.

When possible, register icons before your application displays them. Registration also updates icons already on the page when their names match. Use names such as `app:save` or `lucide:camera` to avoid duplicate names. These names are registry keys, not remote addresses.

```ts
import { registerIcon, unregisterIcon } from '@terminal-kit/core/icons';
import '@terminal-kit/core/components/icon';
import '@terminal-kit/core/components/icon-button';

registerIcon('app:check', {
  width: 24,
  height: 24,
  body: '<path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" stroke-width="2"/>',
});
// Later, remove the registered override and restore the normal fallback behavior.
// unregisterIcon('app:check');
```

```html
<t-icon name="app:check" label="Complete"></t-icon>
<t-icon-button name="app:check" label="Confirm changes"></t-icon-button>
```

Give meaningful standalone icons a `label`. Leave decorative icons unlabeled when adjacent text already conveys their meaning. Give every icon-only button an action label. Provider metadata does not supply the accessible name, or name announced by assistive technology, that your application needs. Manual assistive-technology checks remain separate from DOM assertions, as described in [accessibility evaluation](accessibility.md).

## Registry API

| Function                                    | Accepted data                                               | Result                                                                                   |
| ------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `registerIcon(name, icon)`                  | Full SVG string or `{ body, width?, height?, left?, top? }` | Registers one SVG icon under the exact name                                              |
| `registerFontAwesomeIcon(name, definition)` | Official `IconDefinition` object                            | Registers Font Awesome path data and dimensions                                          |
| `registerLucideIcon(name, nodes)`           | Vanilla Lucide `IconNode` tuples                            | Registers the icon with Lucide stroke defaults                                           |
| `registerIconSet(set, names?)`              | Iconify JSON and optional unprefixed icon names             | Registers selected entries as `prefix:name`, including supported alias transformations   |
| `unregisterIcon(name)`                      | Registered name                                             | Removes that registration and updates matching mounted elements to their normal fallback |

Registration makes a copy of the supplied data. Changing the original object does not update an icon. Register the updated definition again. Raw SVG is filtered during registration. Use reviewed static vector assets and inspect the result, especially when a source uses SVG features beyond simple paths and shapes. This API is not a general document renderer or a file-upload sanitizer.

The object form contains SVG child markup in `body`. Width and height describe the coordinate system and default to 16. Left and top describe a nonzero coordinate origin and default to zero. Supply dimensions explicitly for data from another coordinate system. Use `currentColor` for icons that should follow the component's text color. Raw SVG should include its original `viewBox`, fill, and stroke attributes.

Invalid dimensions, malformed SVG, unsupported markup, and external references cause a `TypeError`. SVG references must be local fragments. Invalid or circular Iconify aliases also fail registration. If you omit the names list, `registerIconSet` registers the complete supplied set, including aliases.

## Ionicons

Ionicons publishes SVG data and a separate web component. Import the icon data when using Terminal Kit. Its web component has its own loading behavior and is unnecessary here. See the [official Ionicons repository](https://github.com/ionic-team/ionicons/blob/main/readme.md).

```ts
import { homeOutline } from 'ionicons/icons';
import { registerIcon } from '@terminal-kit/core/icons';

registerIcon('ion:home-outline', homeOutline);
```

Use named imports for the icons your application needs. The registry accepts Ionicons 8's static SVG data URI directly. It parses local data and performs no request. Recheck the format and production bundle after a provider update. Do not import a complete icon collection just to select one key at runtime.

## Font Awesome Free

Import individual definitions from a Free SVG package. No Font Awesome DOM replacement runtime or stylesheet is needed for this adapter.

```ts
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import { registerFontAwesomeIcon } from '@terminal-kit/core/icons';

registerFontAwesomeIcon('fa:house', faHouse);
```

Font Awesome supports named imports with a compatible production bundler and also documents per-icon deep imports. Avoid passing the complete `fas`, `far`, or `fab` collection to application code. See [Font Awesome tree shaking](https://docs.fontawesome.com/apis/javascript/tree-shaking).

The adapter reads the official definition's dimensions and path data. It does not provide Font Awesome CSS effects, kits, automatic replacement, or Pro asset access. The [official type definition](https://github.com/FortAwesome/Font-Awesome/blob/7.x/js-packages/%40fortawesome/fontawesome-common-types/index.d.ts) describes the provider format.

## Lucide

Use the vanilla package's icon nodes, not React or Vue component functions.

```ts
import { Camera } from 'lucide';
import { registerLucideIcon } from '@terminal-kit/core/icons';

registerLucideIcon('lucide:camera', Camera);
```

Lucide's vanilla `IconNode` is an array of shape-name and attribute tuples. The adapter uses its 24-unit coordinate system and outline defaults. The provider's ESM build supports selective imports. Importing Lucide's entire `icons` object includes the whole collection. See [Lucide's import guide](https://lucide.dev/guide/lucide/getting-started) and [node types](https://github.com/lucide-icons/lucide/blob/main/packages/lucide/src/types.ts).

## Other SVG providers

Bootstrap Icons, Tabler, Google Material, and Heroicons can use the same raw SVG registration. Choose a local SVG file or extract the needed data during your build.

This example uses Vite's `?raw` loader. Other bundlers need their equivalent text loader.

```ts
import checkSvg from 'bootstrap-icons/icons/check.svg?raw';
import { registerIcon } from '@terminal-kit/core/icons';

registerIcon('bi:check', checkSvg);
```

An SVG asset works independently of its provider's React, Vue, or web-font package. Preserve the original view box and drawing attributes when copying or converting an asset. [Bootstrap's official guide](https://icons.getbootstrap.com/) documents its SVG files and package.

## Iconify JSON and build-time subsets

Iconify publishes one JSON package per icon set. Examples include `@iconify-json/bi`, `@iconify-json/tabler`, `@iconify-json/material-symbols`, and `@iconify-json/heroicons`. These packages supply data, not a new icon license. Read the selected package's metadata and upstream license. See [Iconify's package format](https://iconify.design/docs/icons/json.html).

For a small local set:

```ts
import selectedIcons from './generated/app-icons.json';
import { registerIconSet } from '@terminal-kit/core/icons';

registerIconSet(selectedIcons, ['check', 'arrow-right']);
// With prefix "bi", the names become "bi:check" and "bi:arrow-right".
```

The optional names list limits registrations. It does **not** guarantee that a bundler removes other icons from an imported JSON file. For a small download, generate the subset before the application build. Keep the provider data and extraction utilities as development dependencies when the browser needs only generated data.

For example, run this Node script in the consuming application after installing `@iconify-json/bi` and `@iconify/utils`:

```js
import { mkdir, writeFile } from 'node:fs/promises';
import { icons } from '@iconify-json/bi';
import { getIcons } from '@iconify/utils';

const subset = getIcons(icons, ['check', 'arrow-right']);
if (!subset) throw new Error('The selected icon set could not be extracted.');
await mkdir('src/generated', { recursive: true });
await writeFile('src/generated/app-icons.json', JSON.stringify(subset));
```

Use an extraction function that preserves alias dependencies. An alias can reference another icon and add flips or quarter-turn rotations. Copying only `set.icons[name]` can lose aliases and inherited dimensions. See [Iconify JSON aliases](https://iconify.design/docs/types/iconify-json.html) and [`getIcons`](https://iconify.design/docs/libraries/utils/get-icons.html).

For plain HTML, register the generated data from your own local module after importing the standalone bundle's registry exports. Do not combine the standalone bundle with a separate ESM copy of the component library on the same page. The provider examples above require the application's package manager and bundler, not a CDN.

```html
<link rel="stylesheet" href="./dist/themes.css" />
<script type="module">
  import { registerIconSet } from './dist/terminal.js';
  import selectedIcons from './app-icons.js';
  registerIconSet(selectedIcons);
</script>
<t-icon name="bi:check" label="Complete"></t-icon>
```

Here, `app-icons.js` exports the selected Iconify object as its default export. Import registry functions from the same standalone module that registers the components.

## Licenses and attribution

Provider research was checked on 2026-09-23. Pin package versions and preserve the notices that ship with those versions. The table summarizes the named projects, not every similarly named icon collection.

| Provider                                       | Asset license                                                          | Attribution source                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Ionicons                                       | MIT                                                                    | [Ionic license](https://github.com/ionic-team/ionicons/blob/main/LICENSE)                      |
| Font Awesome Free SVG and JavaScript icon data | CC BY 4.0                                                              | [Font Awesome license](https://github.com/FortAwesome/Font-Awesome/blob/7.x/LICENSE.txt)       |
| Font Awesome Free font files                   | SIL OFL 1.1; separate from SVG use                                     | [Font Awesome license](https://github.com/FortAwesome/Font-Awesome/blob/7.x/LICENSE.txt)       |
| Font Awesome supporting code                   | MIT; this does not replace the icon-data license                       | [Font Awesome license](https://github.com/FortAwesome/Font-Awesome/blob/7.x/LICENSE.txt)       |
| Lucide                                         | ISC, with MIT notices for listed Feather-derived icons                 | [Lucide license](https://lucide.dev/license)                                                   |
| Bootstrap Icons                                | MIT                                                                    | [Bootstrap Icons license](https://github.com/twbs/icons/blob/main/LICENSE)                     |
| Tabler Icons                                   | MIT                                                                    | [Tabler license](https://github.com/tabler/tabler-icons/blob/main/LICENSE)                     |
| Google Material Icons / Material Symbols       | Apache 2.0                                                             | [Google Material license](https://github.com/google/material-design-icons/blob/master/LICENSE) |
| Heroicons                                      | MIT                                                                    | [Tailwind Labs license](https://github.com/tailwindlabs/heroicons/blob/master/LICENSE)         |
| Other Iconify sets                             | Set-specific; inspect the selected set's metadata and upstream license | [Iconify licensing explanation](https://iconify.design/)                                       |

Maintain an application attribution file or credits page listing each included provider, exact package version, source URL, license, and modifications. Copy the relevant license and copyright notices into the distributed application. For Font Awesome icon data, retain the CC BY attribution information and identify changes. For Apache assets, retain applicable license and notice information. Keep Lucide's Feather notices when they apply. These steps should follow the actual installed licenses rather than a blanket “all icons are MIT” statement.

Keep icon attribution when an optimizer strips SVG comments. Review brand and trademark usage separately from the artwork license. Registry registration does not transfer ownership or change license terms. Terminal Kit uses the [MIT License](../LICENSE). The third-party icon licenses listed above remain separate.

The demonstration includes three Ionicons, Font Awesome Free solid/regular/brand samples, two Lucide icons, and selected Iconify data. Its pinned package versions, selected names, conversion notes, and upstream license copies are recorded here:

- [Ionicons notice](icon-licenses/ionicons/NOTICE)
- [Font Awesome notice](icon-licenses/font-awesome/NOTICE)
- [Lucide and Feather notice](icon-licenses/lucide/NOTICE)
- [Bootstrap notice](icon-licenses/bootstrap/NOTICE)
- [Tabler notice](icon-licenses/tabler/NOTICE)
- [Heroicons notice](icon-licenses/heroicons/NOTICE)
- [Material Symbols notice](icon-licenses/material-symbols/NOTICE)

Distribute these notices with the built demonstration. Application consumers should preserve notices for the assets they actually include. The sample list is not a license inventory for additional icons an application registers.

## Verification scope

Check the chosen provider samples in the application, inspect generated bundle contents, and confirm no icon request occurs during rendering. Test accessible labels and decorative use separately. Support for a provider format does not establish pixel-identical rendering of every icon in that provider's collection. Custom gradients, masks, filters, multicolor artwork, and SVG references need their own checks.
