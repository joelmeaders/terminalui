# Accessibility evaluation

Terminal Kit targets WCAG 2.2 Level AA for its 35 browser components and shipped themes. This is an engineering target, not a conformance claim. Component checks cannot establish conformance for an application that uses the library. Application content, labels, navigation, validation, timing, and workflows also require evaluation. Use the [WCAG 2.2 standard](https://www.w3.org/TR/WCAG22/) as the normative reference.

## Evidence and limits

Local validation on Windows on 2026-09-23 passed `npm run check`: 223 browser tests passed with 2 emulation skips, all 135 Storybook tests passed, and all 14 production checks passed. Type checks, formatting, size budgets, and the external package consumer also passed. The 66 focused accessibility cases are included in the browser total: 64 passed and 2 were skipped. These counts include behavior and packaging coverage; they are not a count of WCAG criteria or proof of conformance.

Contrast-pair measurements and axe review items are retained in the Playwright output. CI is configured to upload the browser test results even when the job succeeds; this local result does not establish a remote CI result.

Browser tests, Storybook interactions, axe checks, contrast calculations, and screenshots provide evidence for their specific assertions and tested states. Preserve their reports for the exact source revision. A passing run does not prove that every accessibility requirement or assistive technology works.

Run `npm run test:a11y` for the focused `forms-accessibility`, `accessibility-layout`, and `accessibility-contrast` suites. These checks cover their form assertions, layout simulations, and calculated contrast scenarios. The contrast checks use the actual text, control, and focus colors for all six palettes against background, surface, and raised colors. They also calculate contrast against composited default scanline backgrounds. This evidence does not establish screenshot-pixel measurements or manual coverage of every component state.

The paper palette uses darker muted and status colors. All palettes provide a separate `--t-control-border` token for controls. Recheck contrast when an application overrides any foreground, surface, boundary, focus, or effect color.

Review every axe `incomplete` result. Record the affected element, rule, manual finding, and evidence before closing it. An incomplete result is neither a pass nor a confirmed defect. Do not suppress a rule merely to obtain a passing report.

Manual screen-reader evaluation with NVDA and VoiceOver is **pending**. Real browser zoom, text-only resizing, physical touch, and operating-system accessibility settings also need the manual checks below. Native operating-system automation is unavailable in the current authoring environment. No screen-reader certification or spoken-output verification occurred through that environment.

Keep these distinctions in test reports:

| Method                                                                | Evidence it provides                                                              | Evidence it does not provide                                                           |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| DOM or accessibility-tree assertions                                  | Programmatic names, roles, states, relationships, and focus at the sampled moment | What a screen reader speaks, navigation usability, or announcement timing              |
| Narrow browser viewport                                               | Layout at a selected CSS viewport width                                           | Actual browser zoom, text-only enlargement, or physical-device behavior                |
| Injected font or spacing styles                                       | Layout under the styles that reached the tested elements                          | Browser text preferences when those styles differ or fail to reach shadow roots        |
| Emulated forced colors, contrast preference, reduced motion, or touch | Behavior under the selected browser emulation                                     | A real OS contrast theme, assistive setting, physical touch accuracy, or speech output |
| Color and alpha-compositing calculations                              | Ratios for the tested colors, adjacent surfaces, and default scanline composites  | Screenshot-pixel measurements, every rendered state, images, or application overrides  |

## Test setup and records

1. Build the current library and Storybook with `npm run build:site`.
2. Start the compiled site with `npm run preview`.
3. Record the source revision or archive digest, build commands, and full test URL.
4. Record OS, browser, and assistive-technology versions before each manual run.
5. Test the component story and its use in a complete application flow.
6. Record expected behavior, actual behavior, and evidence for each scenario below.

Use current NVDA with Firefox or Chrome on Windows. Record which browser you chose. Also use VoiceOver with Safari on macOS. State the screen reader's navigation mode and relevant verbosity settings. Read actual speech output or a captured speech transcript. Do not substitute an accessibility-tree snapshot for this step.

Use **Pass**, **Fail**, **Blocked**, or **Pending** for each result. A pass applies only to the recorded scenario and environment. For failures, include reproduction steps, expected behavior, actual speech or behavior, an issue reference, and any workaround. Preserve screenshots for visual findings and transcripts for speech findings. Attach a reason and evidence to any criterion exception.

## Manual scenarios

### Forms and actions

- Test all nine form controls: input, textarea, select, checkbox, switch, radio group, range, combobox, and file input. Confirm each label, value, required state, help message, error message, and disabled state is available without visual guessing.
- Submit an empty required form. Correct each error, then submit again. Check the announced error, focus location, error clearing, and completion message. Test both browser constraints and application errors.
- Toggle local disabled state and a disabled fieldset. Confirm disabled controls cannot receive unintended actions. Re-enable them and verify input, focus, and submission.
- Test reset, Enter submission, external form association, submit-button values, keyboard file selection, and range adjustment. Check that state changes remain understandable with speech enabled.
- Check text buttons, icon buttons, pagination, breadcrumb links, and dismiss buttons. Verify accessible names, expected keyboard activation, visible focus, and no unexpected navigation.

Use the applicable [APG widget patterns](https://www.w3.org/WAI/ARIA/apg/patterns/) to review keyboard conventions. ARIA alone does not provide keyboard behavior.

### Collections and navigation

- Combobox: type a query, traverse results, select an option, dismiss with Escape, and reopen. Check announced expanded state, current option, selection, loading, and no-results feedback. Test disabled options and an empty list. Compare behavior with the [combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).
- Tree: traverse visible nodes, expand and collapse branches, and select a node. Confirm hierarchy, expanded state, selected state, and focus remain understandable. Verify disabled nodes and empty content. Consult the [tree view pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/).
- Menu: open from the trigger, traverse actions, skip disabled actions, activate an item, and dismiss. Confirm focus returns to an appropriate trigger after dismissal. Consult the [menu button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/).
- Table: read the caption, column headers, and row content. Sort each sortable column in both directions. Confirm the announced sort state and that row selection retains its identity after sorting. Check selection checkboxes, loading, empty content, and keyboard access to horizontal overflow. Consult the [table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/).
- Tabs and accordion: use the documented arrow, Home/End, activation, and disclosure keys. Check selected or expanded state and the relationship to the visible panel. Ensure hidden panels do not expose active controls. Consult the [tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

### Overlays, status, and supporting content

- Dialog and drawer: open with keyboard and pointer activation. Confirm the announced name, initial focus, focus containment, Escape behavior, and focus restoration. Check long content and a removed or disabled opener. Consult the [modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- Popover and tooltip: open with each supported input method. Dismiss without losing the current task. Check the relationship to the trigger, keyboard reachability of popover actions, and behavior near viewport edges. Tooltip content must remain usable when the pointer moves over it. Check [content on hover or focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).
- Toast and alert: trigger routine and urgent messages while focus remains elsewhere. Listen for the intended announcement once, without an unwanted focus move. Check dismissal, repeated messages, timeouts, and persistence while interacting. Verify important information remains obtainable. Consult [status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
- Progress and spinner: confirm an understandable task label and appropriate determinate or indeterminate feedback. Check skeletons and decorative icons do not add unwanted speech. Check meaningful icons and avatars have appropriate alternatives. Read cards, badges, dividers, empty states, stacks, and grids in document order.

### Enlargement and text spacing

Use the browser's real text-only enlargement feature to test text at 200%. Do not record an injected `font-size` rule as this result. Check labels, errors, menus, tables, tabs, buttons, and overlay content for clipping or lost actions. Record the actual browser setting. See [Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html).

Use real browser zoom at 400%, starting from a content viewport approximately 1280 CSS pixels wide at 100%. Record the resulting viewport and browser zoom indicator. Check ordinary content can be read without two-dimensional scrolling. Evaluate genuine two-dimensional content, such as a data table, under the criterion's exceptions. Keep surrounding controls usable. See [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

Apply all text-spacing changes together: line height 1.5 times font size, paragraph spacing 2 times font size, letter spacing 0.12 times font size, and word spacing 0.16 times font size. Verify that the override reaches text inside each relevant shadow root. Record the tool and computed values. Check for clipping, overlap, or inaccessible actions. An override that reaches only the document body does not establish shadow-content coverage. See [Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html).

### Contrast, preferences, and touch

Check all six palettes in both densities. Include default, hover, focus, checked, selected, error, and loading states. Check normal text at 4.5:1 and qualifying large text at 3:1 against its actual background. Evaluate applicable exceptions explicitly. See [Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Check necessary control boundaries, state indicators, and graphical information at 3:1 against adjacent colors where required. Include the `--t-control-border` token and focus indicators. Decorative panel borders are a different case from boundaries needed to identify controls. See [Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Scanlines paint behind content in an isolated surface, using `z-index: -1`. Opaque child surfaces cover the texture. Subtle scanlines use one-pixel stripes at `0.06` alpha. Pronounced scanlines use two-pixel stripes at `0.12` alpha. Both use four-pixel spacing. The root CRT preset paints a fixed body backdrop behind content, not a foreground overlay.

Repeat representative tasks with glow and scanlines enabled, including strong or pronounced effects. Inspect rendered text, errors, controls, and focus above the textured background. Calculated default composites do not establish every rendered combination. Recheck application overrides to `--t-scanline-color`, opacity, stripe geometry, surfaces, and glow. Opaque and transparent child surfaces can produce different results.

The library disables glow and texture under `prefers-contrast: more` and forced colors. Enable a real Windows contrast theme and an available increased-contrast preference. Confirm controls, selection, disabled states, and focus remain distinguishable. Also test reduced motion. Record real OS settings separately from browser media emulation.

Use a physical touch device to operate compact controls, menus, tabs, pagination, and dismiss actions. Check target size and spacing against the 24 by 24 CSS pixel requirement or an applicable exception. Confirm scrolling does not trigger an unintended action. See [Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## Manual evidence register

### Automated review items from 2026-09-23

The nine catalog layout scans returned no axe violations. They also returned `incomplete` results for two rules. Their JSON attachments are named `axe-layout-review-needed.json` in the Playwright output directories. These results remain review items:

- `aria-valid-attr-value`: axe could not establish the menu trigger's `aria-controls` relationship to its hidden menu inside the shadow root. The source uses matching `menu` IDs; manual assistive-technology behavior still needs verification.
- `color-contrast`: axe could not evaluate non-text symbols, partially clipped table cells, or an overlapping tooltip. The contrast suite covers the shipped semantic colors and scanline composites, but does not close every one of these rendered-state findings.

The focused suite skips the forced-colors form check in WebKit, which does not provide that emulation. Increased contrast set before page load passes in all three engines. A runtime contrast change in the current Firefox automation changes `matchMedia` but does not restyle even an independent native CSS probe. The runtime check records a skip only when that probe fails to update; it does not count the library behavior as a pass. These skips are coverage gaps. The real OS preference checks below remain pending.

This register was prepared on 2026-09-23. No row below records a completed manual run. Replace the pending environment details only after testing. Add separate rows when a scenario has different results across components or configurations.

| Environment and versions                                                 | Test date | Scenario                                                       | Result  | Evidence or issue                                        |
| ------------------------------------------------------------------------ | --------- | -------------------------------------------------------------- | ------- | -------------------------------------------------------- |
| Windows + NVDA + Firefox or Chrome; versions pending                     | Not run   | Forms, labels, errors, required and disabled states            | Pending | Speech and behavior recording required                   |
| Windows + NVDA + Firefox or Chrome; versions pending                     | Not run   | Combobox, tree, menu, table sorting and selection, tabs        | Pending | Speech and keyboard recording required                   |
| Windows + NVDA + Firefox or Chrome; versions pending                     | Not run   | Modal focus restoration, popovers, tooltips, toast/status      | Pending | Speech and focus recording required                      |
| macOS + VoiceOver + Safari; versions pending                             | Not run   | Forms, collections, tabs, overlays, status, supporting content | Pending | Speech and behavior recording required                   |
| Desktop browser with text-only enlargement; version pending              | Not run   | Actual 200% text enlargement                                   | Pending | Setting, screenshots, and operation results required     |
| Desktop browser; version pending                                         | Not run   | Actual 400% browser zoom and reflow                            | Pending | Zoom indicator, viewport, and operation results required |
| Desktop browser and override tool; versions pending                      | Not run   | Text spacing across document and shadow content                | Pending | Applied values and operation results required            |
| Windows contrast theme and increased-contrast settings; versions pending | Not run   | Control boundaries, selection, focus, effects, reduced motion  | Pending | OS settings and screenshots required                     |
| Physical touch device and browser; versions pending                      | Not run   | Compact controls, target spacing, scrolling, dismissal         | Pending | Device details and operation results required            |
| Rendered six-palette matrix; browser pending                             | Not run   | Text/control contrast with effects and representative states   | Pending | Measured pairs, composites, and findings required        |

Before describing a release as accessibility-reviewed, resolve failures or document their scope, preserve automated reports, and complete the applicable manual rows. This document does not authorize a WCAG conformance or certification claim.
