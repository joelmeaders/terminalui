# Maintaining the Storybook manual

Storybook is the component documentation entry point. Each of the 55 component pages has the same structure: setup, a working integration example, live controls, API reference, styling, accessibility, and states. The global framework selector changes setup and code for HTML/JS/CSS, Angular, Vue, and React. Its selection stays in Storybook globals and shareable URLs. The preview always renders the same Web Component.

## Sources of truth

- `.storybook/docs/catalog.ts` holds one usage guide and one example recipe per component. Include meaningful labels, realistic data, event payloads, limitations, and accessibility notes. A new catalog component without a guide fails validation.
- `.storybook/docs/examples.ts` converts each recipe to four framework examples. Imports, object properties, form bindings, custom events, and imperative openers are generated here. Do not keep four independent copies of every example.
- Component source JSDoc supplies API metadata through `scripts/metadata.mjs`. Keep `@slot`, `@fires`, `@csspart`, and `@cssprop` annotations on separate lines. The manifest includes inherited public APIs and excludes private or protected members.
- `docs/frameworks.md`, `docs/icons.md`, `docs/spinners.md`, `docs/slots.md`, and `docs/appearance.md` supply longer guides. The documentation page imports their contents directly. The Appearance introduction and each component's styling section reuse the appearance guide. Edit the original guide to update both repository and Storybook documentation.
- `.storybook/docs/ComponentDocs.tsx` supplies the shared page structure. `.storybook/docs/docs.css` supplies its appearance. Stories remain the source of live states and browser interaction tests.

The framework example is a complete starting recipe. Storybook Controls change the live preview, not that recipe. The page explains this distinction. React examples include a companion CSS block; Angular setup explains the global theme import. Plain HTML examples use the standalone bundle and need no browser import map.

The Typography foundation page uses `docs/typography.md` and `.storybook/docs/typography.ts`. Its one native HTML recipe supplies the preview and all four framework examples. `TypographyDocs.tsx` reuses the component manual's global framework selector. Typography has no custom element or fake catalog entry.

## Validation

Run `npm run build`, then `npm run test:docs`. The check requires a guide and an autodocs story for every component. It checks example property names, custom events, and literal slot/part metadata. It compiles React TypeScript, Angular templates with AOT, and Vue single-file components with custom-element configuration. It then renders all 224 examples in Chromium and checks documented properties, input labels and values, imperative openers, and native typography styles and links. The Angular test harness loads the compiler for partially compiled dependencies; consumer Angular CLI builds use their normal linker.

Run `npm run test:production` to check the built site. This covers every component documentation page, icon registration instructions, global framework selection across navigation and reload, keyboard access, and representative 320 CSS pixel reflow and axe scans. Review attached axe `incomplete` results; do not count them as passes. `npm run check` includes these checks and the existing component, story, package, and size gates.

After changing component metadata, rebuild before starting Storybook. Restart an already running Storybook development server if it retains an old manifest. Do not regenerate watched source or build metadata while development-server browser tests run.

These checks establish executable examples and representative browser behavior. They do not establish manual screen-reader support, real browser zoom coverage, or complete WCAG conformance. Track those checks in [accessibility evidence](accessibility.md).
