# Library review — 2026-09-26

This is a review snapshot, not a second component manual. Storybook remains the component documentation entry point. The review began at `f806538` and covers the 57-component library. The fixes preserve the terminal design, public names, per-component imports, and component features.

## Assessment

The architecture is proportionate to the current features. Retain Lit, native controls, shared interaction helpers, generated metadata, and thin framework adapters. The code has bounded correctness defects and some repeated work; this review does not support a rewrite or removal of features.

A senior reviewer has evidence to approve the corrected behavior within the tested browser scope. There is not enough evidence to call every workload fast, every runtime branch verified, or the library ready for an unrestricted accessibility claim. Performance needs workload measurements. NVDA and VoiceOver results remain pending in [accessibility evidence](accessibility.md).

The tests have **minor excess**. Most tests enforce useful public behavior and past accessibility defects. Browser, palette, framework, and installed-package checks cover different boundaries. Test count alone does not establish their value, and overlap alone does not make a test wasteful.

## Scope and depth

- Inventoried all 134 baseline `src` files: 57 component modules, nine internal modules, three effect modules, 60 adapter modules, two runtime entry modules, and three CSS files.
- Reviewed the public declarations, JSDoc, behavioral bodies, and catalog guides for all 57 components. Traced forms, composites, modal and floating lifecycles, Dock ownership and drag behavior, timers, effects, icon registration, and adapters. Generated React wrappers were reviewed as one uniform family. CSS rule patterns were inspected; source inspection does not establish rendered output.
- Inventoried all 43 baseline Playwright specs, 64 story files, 45 PNG references, both verification scripts, runtime and type fixtures, browser-zoom helper, test configuration, and CI selection. Searched assertion, timing, mock, skip, snapshot, and axe patterns across the suite. Detailed assertion bodies were sampled across every subsystem. This was not an inspection of every assertion branch.
- Reviewed package exports, build and metadata generation, release documentation, framework support, and CI setup. Runtime benchmarks and manual assistive-technology tests were outside this source review.

## Corrections

| Defect                                                                                      | Correction and regression boundary                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rating declared vertical orientation but always used a row.                                 | Preserve the horizontal default and inherit the radio group's vertical column. Add a vertical story and layout, keyboard, event, and FormData checks.                                                                                                                                                                                                                        |
| Icon button declared a size axis but large looked like medium.                              | Add the 50px large action target. Keep small at 32px and medium tied to density. Document and test all sizes, focus, activation, and disabled behavior.                                                                                                                                                                                                                      |
| Seven early component modules registered unconditionally.                                   | Use the same guarded registration as the other 50. Test repeated module evaluation for every component, retained registry identity, and working instances.                                                                                                                                                                                                                   |
| Steps and Menu bound action identity to array position.                                     | Key actions by stable IDs. Preserve focused identity through insertion/reordering and recover from removal/disabling without replacing outside or application-managed focus.                                                                                                                                                                                                 |
| Some focus and event logic used the top document after adoption into another document.      | Use the owning document and retain the original listener document for cleanup. Include iframe-native controls in modal/toolbar traversal and native form submission without top-realm `instanceof` checks. Lock iframe scrolling ancestors and restore library static styles after adoption. Test interactions, focus, cleanup, and timer visibility in an adopted document. |
| Number and calendar deferred focus could replace an application's event-handler focus move. | Reuse guarded focus recovery and test consumer focus changes. Keep default movement when the handler leaves focus unchanged.                                                                                                                                                                                                                                                 |
| Initial date-range start/end could appear in fields but omit the form value.                | Serialize initial endpoint configuration and retain explicit interval precedence. Test initial attributes/properties, form submission, and reset.                                                                                                                                                                                                                            |
| Documentation had stale form counts and method/property spellings.                          | Describe all 19 form controls, include Time Picker in the manual checklist, and use the public `pageSize` and `setCustomValidity()` spellings. Document existing API terms rather than break them with renames.                                                                                                                                                              |
| Installed-package isolation checks covered Button and Dock only.                            | Verify explicit allowed component dependency closures for every native import, every React subpath, and every named React barrel selection. Keep the real pack/install boundary.                                                                                                                                                                                             |
| Some older axe checks discarded incomplete results.                                         | Record violations and review items through a shared evidence helper. Keep violation assertions and existing targeted ARIA assertions. Incomplete results remain review items.                                                                                                                                                                                                |
| An older toast test used real elapsed-time waits.                                           | Use the browser clock for the same pause, resume, restart, and dismissal behavior. Keep real waits that test scrolling or pointer-travel boundaries.                                                                                                                                                                                                                         |

## Component inventory and intentional differences

Names below omit the common `t-` prefix. Every component has a Storybook catalog guide.

| Group                       | Components reviewed                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Text fields — 4             | input, textarea, number-input, password-input                                                                 |
| Date/time/color — 4         | date-picker, date-range-picker, time-picker, color-picker                                                     |
| Single choices — 4          | select, combobox, radio-group, segmented-control                                                              |
| Other form controls — 7     | checkbox, switch, range, rating, multi-select, tags-input, file-input                                         |
| Actions — 5                 | button, icon-button, copy-button, link, chip                                                                  |
| Navigation and choices — 9  | breadcrumb, calendar, command-palette, menu, pagination, steps, tabs, toolbar, tree                           |
| Disclosure and feedback — 7 | accordion, dialog, drawer, popover, tooltip, alert, toast                                                     |
| Display — 12                | avatar, badge, card, description-list, empty-state, icon, meter, progress, skeleton, spinner, table, timeline |
| Layout — 5                  | divider, dock, grid, split-pane, stack                                                                        |

Shared conventions are documented in [frameworks and API terms](frameworks.md#shared-api-terms). Retain these differences:

- Named sizes use small/medium/large. Icon size is pixels and split-pane size is a percentage. Meter's small default preserves the original compact track.
- Field values follow native semantics. Numeric fields and ratings use strings. Boolean choices, multiple selections, and file selection have distinct models and submission types.
- Readonly follows meaningful control behavior. Disabling a native choice is not a readonly substitute because disabled values do not submit.
- Tabs retain `active`; steps and tree use `value`. Divider retains `vertical`; other widgets use `orientation`. Stack retains familiar flex terms. Aliases need a precedence and synchronization contract before introduction.
- `emptyMessage` and `emptyText` remain documented existing names. A rename would break consumers without adding user-facing behavior.
- Drawer uses logical start/end placement. Dock snapping and floating placement use physical edges. Spinner `type`, meter visual `variant`, and action `variant` describe different concepts.
- Toast closing includes a reason; modal closing has no payload. Native input/change events and typed custom events serve different contracts.

## Code quality and performance

Keep the substantial Dock, modal, and icon code. Dock preserves application-owned content, supplies non-drag edit actions, handles cancellation, and reports order without rebuilding children. Modal helpers account for stacked scroll locks, slots, shadow roots, radio groups, and disclosures. Icon registration validates SVG geometry and rejects active or external content. Removing this code would remove supported behavior.

The package emits separate ESM component modules, declarations, shared helpers, and optional adapters/effects. Lit is the only core runtime dependency. This is a useful simplicity and import boundary, rather than proof of a measured rendering cost.

The following are **measurement candidates**, not proven performance failures:

| Area                  | Source observation                                                                                                       | Next useful measurement                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Table                 | `willUpdate`, rendering, and the filter handler derive row state; status/selection changes can repeat filtering/sorting. | Large local data, query changes, paging, and selection-only updates. Measure before adding caches or virtualization. |
| Tree                  | Visible lists are rebuilt and expansion uses array membership checks.                                                    | Deep and wide trees, repeated navigation, expansion, and live updates.                                               |
| Dock/floating content | Mutation scans and placement read geometry synchronously.                                                                | Many nested controls, pointer dragging, resize, and scroll bursts. Check layout work before adding a scheduler.      |
| Toast                 | Display updates use per-frame scheduling even when reduced motion paints less often.                                     | Multiple active notifications, background visibility, and reduced-motion CPU work.                                   |
| Icon registry         | A set registration notifies mounted icon listeners for each icon name.                                                   | Large sets registered with many mounted icons. Preserve atomic validation and visible updates if batching helps.     |

Development runs emit a Lit update warning when Dock rechecks child visibility after its private slots render and measures the new strip. The follow-up is bounded by the slot-change flag and strip identity. Those checks require rendered DOM; the warning does not establish an update loop or a measured performance failure. Include this first-render work in a Dock workload trace before changing the lifecycle.

The build regenerates React source wrappers. Do not regenerate watched files during browser validation: a dev-server reload can replace the fixture. The current documentation already states this sequencing requirement. Generate once, freeze source, then test. A future build change can avoid rewriting unchanged files if this becomes a recurring workflow cost.

## Test value and maintenance

The broad component/form/navigation tests and focused regression tests serve different scenarios. Keep both unless a comparison proves identical input, boundary, and assertion coverage. Retain historical screenshot references as evidence; they are intentionally preserved, not unused production assets.

| Test family           | Evidence protected                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Broad behavior        | Native submission/cancellation/reset, demo composition, navigation, floating content, and constraints.                                                             |
| Focused controls      | Calendar/time/range entry, choice and file state, table filtering/selection, tab activation/orientation, and Dock edits.                                           |
| Accessibility defects | Stable action identity, empty/loading states, nested slot traversal, collapsed regions, modal focus/scroll containment, and application focus ownership.           |
| Contrast/reflow       | Rendered token pairs and symbols, six palettes, effects/preferences, 320 CSS pixel reflow, simulated text enlargement, spacing, targets, and actual Chromium zoom. |
| Appearance/content    | Independent inherited axes, typography scoping, icon geometry/security, slots, effects, spinner/meter motion, and notification deadlines.                          |
| Integration/artifacts | Framework two-way flows, event payload types, compiled examples, installed imports, built documentation, selector persistence, and reviewed Windows screenshots.   |

Generated documentation now proves all 19 form recipes in React, Vue, and Angular (57 model checks). Temporary probe copies retain the real generated bindings and handlers. Checks observe model, host, and native presentation after user interaction, then call the real model setter and confirm a silent round trip. Published recipes remain intact and compile separately. File checks use Chromium FileList assignment and clearing; they do not prove OS picker permissions or other browsers.

Three Menu stories initially failed because their focus assertions compared raw `textContent` with formatter whitespace. The checks now require the focused action's stable value and exact accessible name. They retain navigation and live-option recovery coverage and add a naming contract. The targeted eight Menu checks pass; no accessibility rule was disabled.

Two mobile screenshot checks caught an unintended horizontal Rating gap change from 16px to 8px. The corrected component inherits the original 16px horizontal spacing and 8px vertical spacing. The layout regression checks both values. Historical screenshot references remain unchanged.

Remaining maintenance work:

1. **Share contrast calculation.** The sRGB transform and luminance weights repeat in 16 spec files. Preserve each component's rendered-color collection and assertions. Move the calculation to a test-only helper after returning colors from browser evaluation. Alpha, ancestor backgrounds, and scanline composites must remain explicit; a generic parser must not silently change those expectations.
2. **Keep focused accessibility selection current.** `test:a11y` is a hand-maintained file list. The complete browser suite and CI behavior command include the older broad specs, but the focused selection can drift as new files are added.
3. **Make manual-status assertions follow real evidence.** Built docs currently assert that manual checks are pending. Once a real result is recorded, replace that assertion with a status-aware check. Do not remove the warning before evidence exists.

Consumer event spies and browser-boundary mocks are useful here. Clipboard denial, missing IntersectionObserver, visibility changes, and viewport overrides test actual failure paths. They do not replace the native interaction tests. Keep physical input and actual OS preference checks separate from emulation.

## Missing considerations and priorities

The license and release findings in the table are historical. The owner later selected MIT, made the repository public, and added automated Pages and package publishing.

| Priority                               | Gap                                                                                                                                                                       | Concrete next step                                                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before an accessibility support claim  | NVDA, VoiceOver, speech, physical touch, real text-only enlargement, and OS contrast evidence remain pending. Rendered axe review items remain open.                      | Run the manual matrix in `accessibility.md`; Windows with NVDA is the selected first environment. Record versions, scenario, outcome, and evidence.                               |
| Before a public release                | License intent is broader than an OSI open-source license can satisfy. PolyForm Perimeter limits competing products; it is not a blanket ban on every sale or derivative. | Confirm the desired boundary between applications, component redistribution, derivatives, and competing kits. Retain the current license until that release decision is reviewed. |
| Before a public release                | Version 0.1.0 remains private; no publishing workflow, migration/changelog policy, contribution guide, or security-reporting policy is present.                           | Decide support/version policy and publishing identity, then add release records and maintainer policies. Publication still needs explicit authorization.                          |
| Before advertising broad compatibility | Tests use current Chromium/Firefox/WebKit engines, React 19, Vue 3, and Angular 22. CI uses Node 24 although the package admits other Node versions.                      | Publish a browser minimum/version policy and test the supported Node/framework ranges. Include real Safari/mobile behavior where relevant.                                        |
| International applications             | Calendar locale/RTL and some logical styles exist, but many validation messages, action labels, and status strings remain English.                                        | Define an inherited locale/message provider and fallback contract. Test translated long labels, RTL composites, and native form messages.                                         |
| Server-rendered applications           | SSR and hydration are explicitly unsupported.                                                                                                                             | Decide whether client boundaries satisfy intended consumers. Add SSR deliberately only if needed; do not imply support from browser wrappers.                                     |
| Restrictive host applications          | SVG sanitization has regressions, but no strict CSP/Trusted Types consumer matrix is present.                                                                             | Test a production consumer under the intended policies; document required directives and any unsupported policy.                                                                  |
| Large applications                     | No representative runtime benchmark or workload budget is present.                                                                                                        | Capture consumer traces for large tables/trees, many overlays/icons, and notifications. Optimize measured repeated work while preserving features.                                |
| Advanced data authoring                | No virtualized/editable grid or rich-text editor; file input selects but does not upload. These limits are documented.                                                    | Treat these as separate product decisions. The review does not require new components before manual testing.                                                                      |

The licensing distinction follows [the Open Source Definition](https://opensource.org/osd) and the [official Perimeter 1.0.1 terms](https://polyformproject.org/licenses/perimeter/1.0.1). Perimeter's restriction concerns competition, including free competing products; it is not a general noncommercial license. This review did not change the license or claim legal approval.

After this review, the owner clarified that free forks and derived themes are allowed, paid applications are allowed, and charging for the toolkit itself is prohibited. The subsequent licensing request replaced Perimeter with a custom free-distribution draft. Terminal Kit now uses the MIT License. See [license guidance](licensing.md) for the current terms. The table above records the original audit finding.

## Validation record

The final `npm run check` passed on Windows after the Menu assertion correction and Rating spacing restoration. It ran against frozen runtime, stories, and tests. This proves the listed automated contracts, not screen-reader speech or complete WCAG conformance.

| Check                         | Result                                                                                                                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build, formatting, TypeScript | Passed. Formatting is checked again after this results record is added.                                                                                                                                                                               |
| Documentation examples        | 58 guides and 232 examples compiled/rendered in Chromium; 57 framework form model round trips passed.                                                                                                                                                 |
| Full browser suite            | 1,613 passed, 13 skipped across Chromium, Firefox, and WebKit. Includes every spec selected by `test:a11y`.                                                                                                                                           |
| Storybook                     | 353 tests passed across all 64 story files; accessibility failures remain enabled.                                                                                                                                                                    |
| Built site                    | 92 passed, including existing desktop/mobile screenshots, framework selection, and actual 400% Chromium zoom for the catalog and all 57 component manuals in four framework modes.                                                                    |
| Installed package             | All 57 native imports, 57 direct React imports, and 57 named React barrel selections retained only their allowed dependencies. Types, event payloads, Angular AOT, standalone registration, Dock content identity, and seven provider notices passed. |
| Focused follow-ups            | Eight Menu story checks, three Rating layout/interaction checks, and both mobile screenshot checks passed after their corrections.                                                                                                                    |

During development, `npm run test:a11y` passed 1,484 checks with 13 skips. The final full browser run includes those accessibility specs with the restored horizontal Rating spacing. The skips are nine WebKit forced-colors emulation cases, two non-Chromium browser-zoom cases, one Firefox runtime contrast-restyling probe, and one WebKit native-link Tab probe. The latter two retain evidence from an independent native control or CSS rule; their corresponding real environment behavior remains unverified.

Five adopted-form Chromium regressions and the iframe scroll regression failed before their branch fixes. Two batched Calendar regressions failed against an intermediate focus fix before the final request guard. These are scoped failing-before proofs; the original `f806538` baseline was not run against every new assertion.

Final gzip measurements include Lit and exclude theme CSS/fonts: Button 8,155 bytes; the original three-control form 10,112; Dock 16,483; all 57 components 63,041. Direct/selective-barrel React Button measures 8,738/8,742 bytes and Dock 17,088/17,091, excluding React. Optional CSS/effects remain separate. All reviewed import guards passed.

Visual review included an Amber desktop at 800 pixels and a compact Paper view at 320 CSS pixels during development. The two mobile screenshot differences were inspected before restoring the original spacing. No screenshot reference was updated. Simulated text enlargement, 320 CSS pixel reflow, actual browser zoom, and visual inspection are distinct evidence; none is a manual assistive-technology result. Axe incomplete findings remain review items. NVDA, VoiceOver, speech, physical touch, text-only enlargement, and real OS preference results remain pending in `accessibility.md`.
