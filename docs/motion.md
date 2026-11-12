# Motion preferences

Hullframe uses CSS transitions for control feedback and finite entry effects for overlays. Motion communicates a state change. It does not add flicker or decorative rotation. Repeating motion is limited to working-state indicators, including busy spinners and indeterminate progress stripes.

Palette foregrounds, control backgrounds, and control borders change together without a color transition. This keeps controls readable while an application switches palettes. Other control feedback, such as shadow, filter, and transform effects, can still use the motion tokens.

The default is `data-motion="auto"`. The browser's `prefers-reduced-motion: reduce` preference always takes precedence. Use `data-motion="off"` to disable library motion even when the device allows it.

```html
<html data-theme="amber" data-motion="auto">
  <!-- Application content -->
</html>
```

An application can expose a separate off setting:

```js
document.documentElement.dataset.motion = 'off';
// Restore device-aware behavior:
document.documentElement.dataset.motion = 'auto';
```

The setting inherits through the component styling tokens. Apply it to the document or a component region. `auto` does not mean “force animation” and cannot override the device's reduced-motion request. The library does not change operating-system preferences.

The preference comes from the browser's media query, not a guess about device type or processing power. The W3C definition describes a user preference to reduce nonessential motion. See [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion).

## Tokens

| Token               | Default                     | Purpose                                |
| ------------------- | --------------------------- | -------------------------------------- |
| `--t-motion-fast`   | `120ms`                     | Short control feedback                 |
| `--t-motion-normal` | `180ms`                     | Standard transitions and entry effects |
| `--t-motion-slow`   | `240ms`                     | Longer finite state transitions        |
| `--t-motion-ease`   | `cubic-bezier(.2, 0, 0, 1)` | Shared transition curve                |

Override durations or easing for an application theme. Keep transitions brief and recheck interactions after changing them. The off setting resolves the library's effective durations to zero. Device reduced motion still disables animation when custom token values are present.

```css
.workspace {
  --t-motion-fast: 100ms;
  --t-motion-normal: 160ms;
  --t-motion-slow: 220ms;
  --t-motion-ease: ease-out;
}
```

The tokens control Hullframe effects. They do not automatically disable animation in third-party widgets or application styles. Application-owned animation must honor the same user preference.

## Behavior when motion is off

Control states, focus, validation, and overlay visibility still update. Reduced motion must not prevent an action, delay access to a dialog, or hide completion feedback. Code should use component state and events, not an animation's duration, to determine whether an operation finished.

Indeterminate progress stripes and busy spinners can repeat while work is in progress and motion is enabled. They use a static presentation under `data-motion="off"` or device reduced motion. Preserve an understandable loading label or status because motion alone cannot convey that work is in progress. Determinate values remain available independently of animation.

Entry effects are finite. Closing an overlay must restore focus and update state without waiting for decorative movement. Scanlines and glow remain static appearance effects, with their separate contrast and forced-colors behavior. The motion setting is not an appearance reset.

Disabling animation from interactions is an additional accessibility measure. It does not establish WCAG conformance, and the corresponding WCAG 2.3.3 criterion is Level AAA. See [Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html). Evaluate any new repeating or auto-updating content against [Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).

## Verification

Test each control or overlay in these combinations:

| Application setting | Browser preference | Expected library behavior                          |
| ------------------- | ------------------ | -------------------------------------------------- |
| `auto`              | `no-preference`    | Brief transitions and finite entry effects may run |
| `off`               | `no-preference`    | No motion                                          |
| `auto`              | `reduce`           | No motion                                          |
| `off`               | `reduce`           | No motion                                          |

Also test preference changes while an overlay is open or a busy indicator is active. Check nested component regions and custom duration overrides. Verify that focus, keyboard actions, status labels, and layout remain usable in every combination.

Browser automation can emulate the media preference and inspect computed durations or animation state. That is evidence for the simulated preference and sampled components. It does not prove that a real operating-system setting or assistive technology was tested.

Manual verification with actual device preferences remains pending unless a dated evidence record says otherwise. Record OS and browser versions, application setting, device setting, scenario, observed behavior, and result. Use the process in [accessibility evaluation](accessibility.md). No manual certification is implied by these CSS controls.
