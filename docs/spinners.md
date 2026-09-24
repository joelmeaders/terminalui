# Spinner styles

`t-spinner` indicates work with an unknown completion time. Choose a style with the `type` attribute or property. The default remains `ring`.

| Family   | Types                                               | Appearance                                                                        |
| -------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| Modern   | `ring`, `dots`, `bars`, `pulse`, `orbit`            | Rotating ring, bouncing dots, stretching bars, pulsing disc, orbiting dots        |
| Terminal | `cursor`, `cursor-box`, `arrow`, `pixels`, `blocks` | Blinking underline or block cursor, stepped arrow, chasing pixels, stepped blocks |

```html
<t-spinner type="dots" label="Loading records"></t-spinner>
<t-spinner type="cursor-box" label="Connecting to archive"></t-spinner>
<t-spinner type="arrow" steps="8" size="large" label="Scanning drives"></t-spinner>
<t-spinner type="pixels" label="Reading data"></t-spinner>
```

All types support `size="small|medium|large"` (16, 24, and 40 CSS pixels). The arrow supports `steps="6"` or `steps="8"`. Its position changes at fixed angles without intermediate rotation. Other values use eight positions. Unknown types use the ring. Changing type, size, or steps updates the existing component.

Styles use CSS animation without JavaScript timers or external images. They inherit the theme accent. Set `--t-spinner-color` to override the color. The `indicator` CSS part exposes the visual container. The `item` part exposes its dots, bars, pixels, cursor, or arrow. Check contrast after customization.

```css
.archive-loader {
  --t-spinner-color: var(--t-success);
}
```

The cursors blink once per 1.2-second cycle. Pixel and block styles use discrete steps. All styles stop under `data-motion="off"` or the device's reduced-motion preference. A visible static shape remains, including for cursors. A nested `data-motion="auto"` region can restore motion only when the device permits it. Use the Storybook motion toolbar to compare these states.

Give each spinner a task-specific `label`. The label stays in one polite status region. Animated shapes are hidden from assistive technology and never change the announcement on each frame. Include visible loading text when users need to know which task is pending. Set `aria-busy` on the application region being updated, then remove the spinner and clear that state when work finishes. Do not use indefinite animation as the only evidence of progress. Use `t-progress` when a measured completion value is available.

If adjacent status text already announces the same task, hide the duplicate spinner with `aria-hidden="true"`. Applications control whether work has finished; an animation cycle is not a completion event.

In the workbench, choose **Spinner style** under **Loading & empty states**. The arrow also exposes an **Arrow positions** setting. Storybook includes individual styles, modern and terminal galleries, motion-off states, and nested motion regions.
