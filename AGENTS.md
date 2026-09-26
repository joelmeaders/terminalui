# Repository instructions

- Do nothing destructive without the user's express written consent. E2E tests may remove their own test data.
- Always apply the Simplified Technical English skill. Do not announce it.
- Place worktrees under `{RepositoryName}-worktrees/{WorktreeName}`.
- Preserve the terminal design, public APIs, and unrelated changes.
- Commit each completed request after its required validation passes. Include only changes for that request.
- Preserve component features. Use size measurements to find unnecessary complexity, not to remove features to meet a fixed budget.
- Keep per-component imports for native elements and React wrappers. Verify retained bundle modules from an installed package, including required component dependencies. A small import must not retain unrelated components.

## Accessibility is a requirement

Target WCAG 2.2 Level AA for the component library and its examples. Accessibility fixes take priority over new components.
Include accessibility in implementation, stories, tests, documentation, and review. Do not defer it to a final audit.

### Components and interaction

- Prefer native HTML semantics and controls inside custom elements. Use ARIA only for semantics that native elements cannot provide.
- Give every interactive control a useful accessible name. Associate labels, instructions, required state, and errors with the actual control.
- Preserve keyboard operation, visible focus, logical focus order, and disabled behavior. Never use positive `tabindex` in library markup.
- Follow the relevant WAI-ARIA Authoring Practices pattern for composite widgets. Test navigation, selection, and disabled options.
- Choice controls must leave focus unchanged on initial render. Recover focus after live option changes only when the control already had focus.
- Modals must contain keyboard focus and restore it on close. Account for slots, shadow roots, radio groups, and collapsed disclosures.
- Modals must prevent background wheel, touch, and keyboard scrolling while keeping their content scrollable. Preserve page position and styles. Test stacked modals and removal cleanup.
- Floating content must support dismissal and remain reachable at viewport edges. Hover help must remain visible when the pointer enters it.
- Announce asynchronous status and validation changes appropriately. Avoid duplicate announcements and unnecessary assertive live regions.
- Do not convey meaning through color, animation, hover, or icons alone. Give icon-only actions specific names.

### Visual design and user preferences

- Keep appearance axes independent and inherited from `html`, `body`, regions, and component hosts. The nearest explicit value wins. Removing it restores inheritance. A palette must not reset fonts, density, or motion tokens.
- Test nested palettes with native typography, slots, shadow roots, and open overlays. Scanline settings inherit, while `.t-screen` supplies an opaque surface so nested textures and local opt-outs remain visually independent.
- Test all shipped palettes. Normal text needs at least 4.5:1 contrast. Qualifying large text needs at least 3:1.
- Essential control boundaries, state indicators, and custom focus indicators need at least 3:1 against adjacent colors.
- Use `--t-control-border` for meaningful control boundaries. Reserve `--t-border` for decorative dividers and panel framing.
- Validate contrast from rendered colors and semantic token pairs. Do not assume an axe pass checks every boundary or effect.
- Keep glow and scanlines optional and off by default. Disable decorative effects in forced colors and increased-contrast preferences.
- Screen texture must not reduce the readability of essential content. Review composited effects, not just underlying text colors.
- Honor reduced motion. Do not introduce flashing or flickering terminal effects.
- Use the shared motion tokens. Respect both `data-motion="off"` and device reduced-motion preferences, including nested regions.
- Keep focus, validation, and overlay closing independent of animation timing. Floating entrance effects must not break viewport placement.
- Verify that built-in and provider SVG icons draw visible geometry. An accessible name or a path node alone does not prove rendering.
- Support 200% text enlargement, WCAG text-spacing overrides, and reflow at 320 CSS pixels without losing content or controls.
- Allow scrolling within content that needs two dimensions, such as data tables. Do not hide essential content to eliminate overflow.
- Meet the 24 CSS pixel minimum target requirement or a documented WCAG exception. Prefer larger targets where layout permits.
- Ensure focus is not obscured by fixed content, overlays, clipping, or scroll containers. Test compact density and long labels.

### Required evidence

- Add meaningful regressions for each accessibility defect. Do not disable rules, hide offending controls, or weaken assertions to pass.
- Keep Storybook accessibility checks enabled as failures. Include relevant focus, disabled, invalid, loading, empty, and open states.
- Run `npm run test:a11y`, affected component tests, and relevant Storybook tests during development.
- Before handing off changes, run `npm run check`. Explain any failed or unavailable check precisely.
- Review visual differences before updating screenshot references. Preserve historical references when adding an intentional accessibility baseline.
- Report axe `incomplete` findings as review items. Do not count them as verified passes.
- Distinguish 320 CSS pixel reflow and simulated text enlargement from actual browser zoom testing.
- Keep actual 400% Chromium browser-zoom checks for the catalog and built documentation. Record browser zoom separately from manual visual review.
- Distinguish automated browser/ARIA checks from manual screen-reader testing. Never claim one proves the other.
- Record manual test results and remaining gaps in `docs/accessibility.md`. Include browser, OS, assistive technology, scenario, and outcome.
- Require manual NVDA and VoiceOver validation of forms, composite widgets, modals, errors, and live regions before claiming assistive-technology support.
- Do not claim complete WCAG conformance from test counts. State the tested scope and unresolved barriers.

Continue authorized fixes and automated checks when a manual testing environment is unavailable. Record that gap explicitly.
For framework examples, verify that labels, focus, values, and events survive the integration.

## Documentation is part of each component

- Use Storybook as the component documentation entry point. Do not add a second documentation system without a demonstrated need.
- Each component needs a guide in `.storybook/docs/catalog.ts`: purpose, usage, a complete example, events or form behavior, and accessibility guidance. Keep one example recipe and generate the HTML/JS/CSS, Angular, Vue, and React versions from it.
- Document public slots, events, CSS parts, and component CSS properties in source JSDoc. Keep private implementation details out of the published manifest.
- Keep project setup and icon-provider instructions in the shared Markdown guides. Storybook must display those guides where users need them, including icon registration and imports on both icon component pages.
- Preserve the global framework selector across component navigation. Clearly distinguish framework integration code from the shared Web Component preview.
- Run `npm run test:docs` after the package build. It compiles and renders all framework examples. Built Storybook documentation, switcher, accessibility, and reflow checks run in `npm run test:production` and the full check.

## References

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Project accessibility evidence and manual checks](docs/accessibility.md)
