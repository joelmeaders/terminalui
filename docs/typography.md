# Typography

## Style a region or one element

Import `themes.css`, then `typography.css`. Add `.t-prose` to an article, content panel, or other reading region. Its headings, paragraphs, anchors, lists, quotes, code, and inline text receive the shared styles.

The stylesheet is opt-in. Importing it alone does not reset the page or style unmarked headings and links. Native content inside `.t-prose` is styled, including light-DOM content passed to slots. Component shadow roots keep their own styles. Keep unrelated widgets outside a prose region when they need independent text styling.

```html
<section class="t-prose">
  <h2>Connection details</h2>
  <p>Read the <a href="/guide">connection guide</a>.</p>
</section>

<h2 class="t-h1">A large section heading</h2>
<p class="t-text t-text-small t-muted">Last updated just now.</p>
<a class="t-link" href="/settings">Open settings</a>
```

The content inherits the current palette. Set `data-theme` on a parent or the prose region. Give the surrounding surface an appropriate background, such as `background: var(--t-bg)`. Palette attributes supply tokens; they do not paint that background for you. Nested palette changes also update link and text colors.

## Headings and reading sizes

Use `h1` through `h6` for document structure. Choose heading levels by nesting, not visual size. The `.t-h1` through `.t-h6` classes change appearance without changing the element's heading level.

- **Heading 1:** 3rem / 48px at a 16px root.
- **Heading 2:** 2.25rem / 36px.
- **Heading 3:** 1.75rem / 28px.
- **Heading 4:** 1.5rem / 24px.
- **Heading 5:** 1.25rem / 20px.
- **Heading 6:** 1rem / 16px.
- **Small:** `.t-text-small`, 0.875rem / 14px.
- **Medium:** `.t-text-medium`, 1rem / 16px. This is the default reading size.
- **Large:** `.t-text-large`, 1.25rem / 20px.

Small, medium, and large match the library's size terminology. Apply a reading size to the prose region or an individual paragraph. Heading sizes remain independent. `.t-lead` uses the large size for introductory text. `.t-eyebrow` adds a small uppercase section label. `.t-muted` changes only the color; use it for secondary information, not disabled-state semantics.

`.t-text` supplies the base font, color, wrapping, and paragraph spacing outside a prose region. Size and tone helpers can be combined with it. `.t-prose` limits reading width to 68ch. Set `--t-prose-width: none` for a full-width region.

## Native anchors and the Link component

Native `<a href>` elements inside `.t-prose`, and standalone `<a class="t-link" href>`, have a persistent underline and visible keyboard focus. Hover increases the underline weight. Link appearance does not add navigation behavior or change the URL. An anchor without `href` keeps its non-link semantics.

Use a real destination and descriptive text. Use a button for an action. For an external tab, add `target="_blank"`, `rel="noopener noreferrer"`, and visible text such as “opens in a new tab.” CSS cannot supply accessible names or validate destinations.

The existing `t-link` Web Component remains useful for icon slots, disabled state, URL-scheme checks, and its external-window hint. The `.t-link` CSS class and the `<t-link>` element are separate APIs. In React, use `className`; Vue and Angular use `class`. No custom-element setup is needed for native typography.

## Inline content, lists, and code

Use native `strong`, `em`, `small`, `mark`, `abbr`, `code`, `kbd`, and `samp` elements for their intended meaning. Highlighted text uses the palette's accent and its matching foreground. `kbd` has a visible border. Spell out unfamiliar abbreviations in the text; a `title` tooltip is not an adequate explanation by itself.

Ordered, unordered, and definition lists retain native markers and semantics. Quotes use a logical leading border, so right-to-left content puts it on the correct side. Add a visible attribution when needed. Figures and captions retain their native meaning.

Code blocks preserve whitespace and scroll horizontally when needed. Give a scrollable block a name and a keyboard stop:

```html
<div class="t-prose">
  <pre
    tabindex="0"
    role="region"
    aria-label="Connection command"
  ><code>terminal connect --workspace orbital --read-only</code></pre>
</div>
```

For prose-like logs that should wrap, apply `white-space: pre-wrap; overflow-wrap: anywhere` to the `pre`. There is no syntax-highlighting runtime or automatic copy action.

## Tokens and overrides

Set these properties on the prose region or an ancestor. Defaults use relative units so browser text settings can scale them.

- `--t-prose-width`: `68ch` reading width.
- `--t-text-leading`: `1.7` body and code line height.
- `--t-text-size-small`, `--t-text-size-medium`, `--t-text-size-large`: `0.875rem`, `1rem`, `1.25rem`.
- `--t-heading-1` through `--t-heading-6`: the six heading sizes above.
- `--t-heading-leading`: `1.2`.
- `--t-heading-weight`: `600`.
- `--t-heading-color`: defaults to the current `--t-text`.
- `--t-link-color`: defaults to the current `--t-accent`.

Text also uses the shared `--t-font`, `--t-text`, `--t-muted`, `--t-raised`, `--t-accent`, `--t-on-accent`, `--t-focus`, and line-width tokens. It does not download fonts. Native selectors have zero specificity; heading-size classes have ordinary class specificity. Application CSS can override them without `!important`.

```css
.article {
  --t-prose-width: 60ch;
  --t-text-leading: 1.8;
  --t-heading-1: 2.5rem;
}
```

## Accessibility and display effects

Headings, lists, links, and emphasis remain native HTML. Keep a logical heading hierarchy, meaningful link text, and visible focus. Do not communicate status with color or uppercase styling alone. Text helpers do not create live regions or add roles.

Long words and URLs can wrap. Code blocks retain their own scroll area. Text has no fixed-height boxes or entrance animation. Test at 320 CSS pixels, with enlarged text, and with text-spacing overrides. A narrow viewport does not prove actual browser zoom support.

Glow and scanlines remain inherited appearance settings. Use a `.t-screen` surface for texture. Forced colors retain native link colors, highlights, borders, and focus. Reduced-motion preferences need no typography animation override because these styles do not animate. Recheck contrast when changing colors or adding custom effects.

Automated palette, keyboard, reflow, and framework checks accompany these examples. Manual NVDA, VoiceOver, real zoom, and operating-system contrast checks remain pending in the accessibility evidence register.
