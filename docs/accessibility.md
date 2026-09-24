# Accessibility evaluation

Terminal Kit targets WCAG 2.2 Level AA for its 50 browser components and shipped themes. This is an engineering target, not a conformance claim. Component checks cannot establish conformance for an application that uses the library. Application content, labels, navigation, validation, timing, and workflows also require evaluation. Use the [WCAG 2.2 standard](https://www.w3.org/TR/WCAG22/) as the normative reference.

## Evidence and limits

Local validation of the 50-component library and native typography on Windows on 2026-09-23 covered all required check stages. The full `npm run check` passed build, formatting, types, all 204 framework examples, and 525 browser tests with six emulation skips. It stopped in Storybook when three suites could not fetch the test setup module; a full Storybook rerun passed all 248 tests across 56 files. The remaining stages completed separately: all 75 production checks, size budgets, and the external package consumer passed. The new production focus test first needed its keyboard input setup corrected, then passed both its focused rerun and the complete production suite. The focused accessibility selection passed 366 cases with six emulation skips. Final types and formatting also passed. These counts describe tested scenarios; they are not a count of WCAG criteria or proof of conformance.

The previous slot update recorded an intermittent Firefox meter-motion failure after a runtime reduced-motion change. Its focused reruns and the current complete browser and accessibility runs pass. This history remains recorded; the passing runs do not establish that the intermittent issue can never recur.

Contrast-pair measurements and axe review items are retained in the Playwright output. CI is configured to upload the browser test results even when the job succeeds; this local result does not establish a remote CI result.

Native typography checks cover semantic heading levels, independent visual sizes, underlined anchors, visible keyboard focus, fragment navigation, keyboard scrolling of named code regions, right-to-left spacing, inherited tokens, and unchanged unmarked content. All six palettes pass 320 CSS pixel reflow with simulated 200% root text and WCAG spacing overrides in Chromium, Firefox, and WebKit. Chromium and Firefox also pass forced-color emulation. The keyboard test compares focus after a code region with the same native markup without typography CSS; the Windows WebKit runner skips native links in that tab sequence in both cases. This records native behavior, not manual Safari keyboard or screen-reader support.

Visual review in the Codex in-app Chromium browser on Windows on 2026-09-23 checked native typography at desktop and 320 CSS pixels, the paper palette, right-to-left content, and the Storybook guide. Browser version was not recorded. The review corrected a documentation focus rule that overrode the paper palette's native link indicator. A production regression verifies the theme's focus color during keyboard use. Manual screen-reader speech, real browser zoom, and real OS settings remain pending.

Browser tests, Storybook interactions, axe checks, contrast calculations, and screenshots provide evidence for their specific assertions and tested states. Preserve their reports for the exact source revision. A passing run does not prove that every accessibility requirement or assistive technology works.

Run `npm run test:a11y` for the focused contrast, layout, forms, extended forms, extended navigation, icons, motion, modal scrolling, notification countdown, spinner, meter, and slot composition suites. These checks cover their form assertions, layout simulations, and calculated contrast scenarios. The contrast checks use the actual text, control, and focus colors for all six palettes against background, surface, and raised colors. They also calculate contrast against composited default scanline backgrounds. This evidence does not establish screenshot-pixel measurements or manual coverage of every component state.

Slot checks cover decorative icons, native labels and descriptions, keyboard actions, disabled fieldsets, validation/reset, right-to-left placement, dynamic content, notification pause and focus return, readable wrapping, and narrow layouts with enlarged text. The shared field frame carries input focus when affixes are present; slotted actions keep their own focus indicators. The slot guide explains valid compositions and the application's responsibility for names, units, event handling, and read-only actions. Framework checks verify named-slot assignment in all 200 rendered examples.

Visual review in the Codex in-app Chromium browser on Windows on 2026-09-23 checked button icons, input and action focus, number-field suffixes, and notification message/action wrapping, including a 320 CSS pixel viewport. The browser version was not recorded. This review found and corrected a focus-ring overlap and narrow notification wrapping; it does not close the manual assistive-technology, OS-preference, or real-zoom checks below.

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

The 50-component expansion adds native form, keyboard, modal search, split-pane, clipboard, SVG rendering, and motion checks. New form checks measure all six palettes. Navigation checks retain screenshots and geometry evidence for narrow layouts and text-spacing simulations. Provider checks use real data from seven icon sets, plus decorative and meaningful names. Motion checks cover automatic behavior, explicit off, reduced motion, nested overrides, and a runtime preference change in three browser engines.

Additional axe review items remain recorded. The number step button's minus glyph has measured contrast of at least 4.5:1 in each palette. For the active command description, six narrow/spacing cases show unclipped text, successful hit tests, and 6.82:1 computed contrast. Axe still reports that description and decorative step symbols as incomplete. These targeted measurements do not close every rendered state or manual assistive-technology check.

The actual demo was inspected through browser UI at desktop and 390 CSS pixels. This is visual review of those views, not a screen-reader, OS-preference, or real zoom result. Original component-area screenshot references remain intact. Expanded full-page references include the added catalog and repaired built-in SVG geometry.

Modal scrolling regressions cover dialogs, drawers, and the command palette in Chromium, Firefox, and WebKit. They check wheel input, arrow keys, Page Up/Down, Home/End, and Space against page and application-container backgrounds. Long content remains scrollable, including keyboard scrolling, text editing, and command selection. Tests also cover page position, scrollbar layout, focus return, author styles, stacked modals, native closing, and removal/reconnection. Physical touch-device scrolling remains pending.

Notification countdown checks cover shrinking bars and spinners with seconds or milliseconds. Tests use a controlled clock to check the deadline, zero at dismissal, hover/focus pause, simulated page visibility, live property changes, persistent durations, and reconnection. The countdown remains outside the persistent message live region, so its updates do not mutate the announcement. This follows the persistent-container approach in [W3C technique ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22). Tests check reduced-motion and explicit motion-off behavior, six-palette axe results, and layout at 320 CSS pixels with enlarged text. These checks do not prove spoken output or real browser background-tab scheduling. Default notifications remain persistent. Applications must keep important messages available when they enable auto-dismiss.

The ten spinner styles retain one stable status label and hide animated shapes from assistive technology. Browser tests verify visible geometry at all three sizes, six- and eight-position arrow steps, clockwise pixel frames, runtime property changes, and 320 CSS pixel layout. Tests also verify motion off, device reduced motion, nested motion regions, preference changes, and static cursor visibility after disabling motion mid-blink. Cursors blink once per 1.2-second cycle. Forced-color checks cover Chromium and Firefox; WebKit cannot emulate this mode. Six-palette scans check axe violations and confirm that indicators use the tested theme accent. Modern and terminal galleries received a visual browser review on Windows. These checks do not establish screen-reader announcements or a real OS contrast-theme result.

Meter checks cover solid and thin/thick segmented fills, small/medium/large heights, range normalization, and a stable native measurement during animation. The entrance waits for page or nested-scroll visibility, runs once per connection, and preserves segment widths. Tests cover motion off, device reduced motion, nested overrides, runtime preference changes, reconnection, missing IntersectionObserver, zero duration, right-to-left fill direction, and 320 CSS pixel reflow with enlarged and spaced text. Forced-color emulation in Chromium and Firefox retains the native meter; screenshots verify that its painted fill changes with the value. WebKit cannot emulate this mode. The styles, sizes, keyboard-operated scroll preview, and workbench controls received a visual browser review on Windows at desktop and 320 CSS pixels. Manual screen-reader speech, actual browser zoom, and real OS contrast themes remain pending.

The expanded Storybook manual was reviewed at desktop and 320 CSS pixels on Windows. All 50 component documentation pages and the Typography foundation page passed built-page checks. The global framework selector passed keyboard, toolbar, navigation, and reload checks; section links stay inside the preview frame. All 204 generated HTML, React, Vue, and Angular examples rendered with their documented properties or native styles in Chromium. React examples also passed strict TypeScript checks, Angular templates passed AOT compilation, and Vue examples passed single-file component compilation. These checks cover executable recipes, not every application integration or assistive technology.

The Icon, Input, and Dialog documentation pages passed representative 320 CSS pixel reflow and axe violation checks with Angular setup expanded. The manual fixes low-contrast default Storybook links and boolean labels, wraps long inline code, and keeps wide tables in keyboard-reachable scroll regions. These scans still return review items, listed below.

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

- Test all 15 form controls: input, textarea, select, checkbox, switch, radio group, range, combobox, file input, password input, number input, segmented control, rating, tags input, and color picker. Confirm each label, value, required state, help message, error message, and disabled state is available without visual guessing.
- Submit an empty required form. Correct each error, then submit again. Check the announced error, focus location, error clearing, and completion message. Test both browser constraints and application errors.
- Toggle local disabled state and a disabled fieldset. Confirm disabled controls cannot receive unintended actions. Re-enable them and verify input, focus, and submission.
- Test reset, Enter submission, external form association, submit-button values, keyboard file selection, and range adjustment. Check that state changes remain understandable with speech enabled.
- Check text buttons, icon buttons, pagination, breadcrumb links, and dismiss buttons. Verify accessible names, expected keyboard activation, visible focus, and no unexpected navigation.

Use the applicable [APG widget patterns](https://www.w3.org/WAI/ARIA/apg/patterns/) to review keyboard conventions. ARIA alone does not provide keyboard behavior.

### Collections and navigation

- Command palette: open, search, traverse enabled commands, activate a result, check the empty/loading states, and dismiss. Confirm search focus, result announcements, and return to the opener.
- Steps and toolbar: check ordered current-step information, unavailable actions, arrow navigation, Home/End, and focus when an action becomes disabled.
- Split pane: identify each region and separator. Resize with arrow keys, Home/End, and pointer input. Check value announcements, bounds, orientation, and stacked narrow layouts.

- Combobox: type a query, traverse results, select an option, dismiss with Escape, and reopen. Check announced expanded state, current option, selection, loading, and no-results feedback. Test disabled options and an empty list. Compare behavior with the [combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).
- Tree: traverse visible nodes, expand and collapse branches, and select a node. Confirm hierarchy, expanded state, selected state, and focus remain understandable. Verify disabled nodes and empty content. Consult the [tree view pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/).
- Menu: open from the trigger, traverse actions, skip disabled actions, activate an item, and dismiss. Confirm focus returns to an appropriate trigger after dismissal. Consult the [menu button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/).
- Table: read the caption, column headers, and row content. Sort each sortable column in both directions. Confirm the announced sort state and that row selection retains its identity after sorting. Check selection checkboxes, loading, empty content, and keyboard access to horizontal overflow. Consult the [table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/).
- Tabs and accordion: use the documented arrow, Home/End, activation, and disclosure keys. Check selected or expanded state and the relationship to the visible panel. Ensure hidden panels do not expose active controls. Consult the [tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

### Overlays, status, and supporting content

- Copy button: check successful and denied clipboard access, pending feedback, duplicate activation, visible completion text, and the live announcement. Focus must remain on the action.
- Provider icons: verify useful names for meaningful artwork and icon-only actions. Confirm decorative artwork does not duplicate adjacent text.
- Meter, timeline, and description list: read the measurement name/value, ordered events and dates, and term/value relationships without relying on color or visual placement.

- Dialog and drawer: open with keyboard and pointer activation. Confirm the announced name, initial focus, focus containment, Escape behavior, and focus restoration. Check long content and a removed or disabled opener. Consult the [modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- Modal scrolling: test dialogs, drawers, and command palettes with wheel, keyboard, and physical touch input. The background must stay still. Long modal content must scroll. Check both ends of that content, stacked modals, and restored page position after closing.
- Popover and tooltip: open with each supported input method. Dismiss without losing the current task. Check the relationship to the trigger, keyboard reachability of popover actions, and behavior near viewport edges. Tooltip content must remain usable when the pointer moves over it. Check [content on hover or focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).
- Toast and alert: trigger routine and urgent messages while focus remains elsewhere. Listen for the intended announcement once, without an unwanted focus move. Check dismissal, repeated messages, timeouts, and persistence while interacting. Verify important information remains obtainable. Consult [status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
- Timed notifications: inspect each countdown style and unit. Confirm hover and keyboard focus pause it. Switch browser tabs and return. Check that the message is announced without repeated countdown speech. Test the reduced-motion setting and confirm a persistent copy exists when the message must remain available.
- Progress and spinner: confirm an understandable task label and appropriate determinate or indeterminate feedback. Check each spinner type with motion on and off. Confirm cursors stay visible without motion and changing shapes do not cause repeated announcements. Check skeletons and decorative icons do not add unwanted speech. Check meaningful icons and avatars have appropriate alternatives. Read cards, badges, dividers, empty states, stacks, and grids in document order.

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

The native typography fixture returns no axe violations or incomplete findings in all 18 browser/palette combinations. Reports are saved as `typography-<theme>-axe-review.json`. The built Typography documentation scan at 320 CSS pixels returns no violations and retains `color-contrast` review items for overlapping Storybook Controls content, the Link component example, and the figure's non-text symbols. These are unresolved review items, not verified contrast passes. Its report is `typography-documentation-axe-review.json` in the production output.

The three Storybook documentation scans return `color-contrast` incomplete findings for partially clipped table cells and overlapping Storybook Controls category labels. The Input page also returns `aria-prohibited-attr` for Storybook's boolean-control labels, where axe cannot establish support for `aria-label` on the label element. These are unresolved review items, not verified passes. Reports are saved as `documentation-axe-review.json` in each production documentation test's output directory. CI retains the Windows output even when the tests pass. Manual screen-reader and real zoom checks of the documentation remain pending.

The expanded slot-guide scans on the Button, Input, and Toast documentation pages also return no violations, with `aria-prohibited-attr` and `color-contrast` review items. These concern Storybook's boolean-control labels, clipped or overlapping table/control content, and the Toast countdown digits and units. Reports are saved as `<story-id>-slots-axe-review.json` in the production output. These checks establish no horizontal page overflow at 320 CSS pixels; scrollable API tables still need the manual review above.

The nine catalog layout scans returned no axe violations. They also returned `incomplete` results for two rules. Their JSON attachments are named `axe-layout-review-needed.json` in the Playwright output directories. These results remain review items:

- `aria-valid-attr-value`: axe could not establish the menu trigger's `aria-controls` relationship to its hidden menu inside the shadow root. The source uses matching `menu` IDs; manual assistive-technology behavior still needs verification.
- `color-contrast`: axe could not evaluate non-text symbols, partially clipped table cells, or an overlapping tooltip. The contrast suite covers the shipped semantic colors and scanline composites, but does not close every one of these rendered-state findings.

Timed-spinner palette scans also return `color-contrast` review items for the countdown digits and unit. Axe reports an overlapping element around the ring. The preview was visually inspected, but this does not close the rendered contrast review. Reports are saved as `toast-<theme>-axe-review.json` in each browser's Playwright output directory. The message live region and countdown DOM checks do not prove screen-reader speech behavior.

The spinner scans returned no axe violations or incomplete findings in all 18 browser/palette combinations. Their reports are saved as `spinners-<theme>-axe-review.json` in each browser's Playwright output directory.

The meter palette scans returned no axe violations or incomplete findings in all 18 browser/palette combinations. Reports are saved as `meters-<theme>-axe-review.json`. Storybook's scrollable Viewport Entry example returns `color-contrast` review items for text outside the visible scroll area: the meter label/value before scrolling, and the instruction paragraph after scrolling. A visible-meter rescan clears the label/value findings. This does not close the clipped-content review or the manual contrast matrix.

The slot composition scans return no axe violations across all six palettes and three engines. Their `slots-<theme>-axe-review.json` reports retain `aria-valid-attr-value` review items for the hidden menu relationship and `color-contrast` review items for the menu arrow and number-input decrement symbol. The source has matching menu IDs; these findings remain open for rendered contrast and assistive-technology review.

The focused suite skips the forced-colors form, spinner, meter, slot, and typography checks in WebKit, which does not provide that emulation. Increased contrast set before page load passes in all three engines. A runtime contrast change in the current Firefox automation changes `matchMedia` but does not restyle even an independent native CSS probe. The runtime check records a skip only when that probe fails to update; it does not count the library behavior as a pass. These skips are coverage gaps. The real OS preference checks below remain pending.

This register was prepared on 2026-09-23. No row below records a completed manual run. Replace the pending environment details only after testing. Add separate rows when a scenario has different results across components or configurations.

| Environment and versions                                                 | Test date | Scenario                                                          | Result  | Evidence or issue                                         |
| ------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------- | ------- | --------------------------------------------------------- |
| Windows + NVDA + Firefox or Chrome; versions pending                     | Not run   | Forms, labels, errors, required and disabled states               | Pending | Speech and behavior recording required                    |
| Windows + NVDA + Firefox or Chrome; versions pending                     | Not run   | Combobox, tree, menu, table sorting and selection, tabs           | Pending | Speech and keyboard recording required                    |
| Windows + NVDA + Firefox or Chrome; versions pending                     | Not run   | Modal focus restoration, popovers, tooltips, toast/status         | Pending | Speech and focus recording required                       |
| macOS + VoiceOver + Safari; versions pending                             | Not run   | Forms, collections, tabs, overlays, status, supporting content    | Pending | Speech and behavior recording required                    |
| Windows + NVDA and macOS + VoiceOver; versions pending                   | Not run   | Native headings, links, lists, quotes, and code-region navigation | Pending | Speech, heading navigation, and keyboard results required |
| Desktop browser with text-only enlargement; version pending              | Not run   | Actual 200% text enlargement                                      | Pending | Setting, screenshots, and operation results required      |
| Desktop browser; version pending                                         | Not run   | Actual 400% browser zoom and reflow                               | Pending | Zoom indicator, viewport, and operation results required  |
| Desktop browser and override tool; versions pending                      | Not run   | Text spacing across document and shadow content                   | Pending | Applied values and operation results required             |
| Windows contrast theme and increased-contrast settings; versions pending | Not run   | Control boundaries, selection, focus, effects, reduced motion     | Pending | OS settings and screenshots required                      |
| Physical touch device and browser; versions pending                      | Not run   | Compact controls, target spacing, scrolling, dismissal            | Pending | Device details and operation results required             |
| Rendered six-palette matrix; browser pending                             | Not run   | Text/control contrast with effects and representative states      | Pending | Measured pairs, composites, and findings required         |

Before describing a release as accessibility-reviewed, resolve failures or document their scope, preserve automated reports, and complete the applicable manual rows. This document does not authorize a WCAG conformance or certification claim.
