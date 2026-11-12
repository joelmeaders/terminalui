import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { expect, userEvent, within } from 'storybook/test';
import { TypographyDocs } from '../.storybook/docs/TypographyDocs';
import { typographyExample } from '../.storybook/docs/typography';
import { markup } from '../.storybook/docs/examples';
import '../src/typography.css';
import '../src/components/link';
import '../src/components/icon';

const meta = {
  title: 'Introduction/Typography',
  tags: ['autodocs'],
  parameters: { docs: { page: TypographyDocs } },
  args: { size: 'medium' },
  argTypes: { size: { control: 'select', options: ['small', 'medium', 'large'] } },
  render: ({ size }) =>
    html`${unsafeHTML(
      markup({ ...typographyExample, attrs: { class: `t-prose t-text-${size}` } }, 'html', false),
    )}`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
export const Headings: Story = {
  render: () =>
    html`<section class="t-prose">
      <p class="t-eyebrow">The heading scale</p>
      <h1>Heading 1 — Main title</h1>
      <h2>Heading 2 — Section</h2>
      <h3>Heading 3 — Subsection</h3>
      <h4>Heading 4 — Detail</h4>
      <h5>Heading 5 — Small section</h5>
      <h6>Heading 6 — Nested detail</h6>
      <hr />
      <h2 class="t-h1">A section with a title-size style</h2>
      <p>This remains a level-two heading. Its class changes only the visual size.</p>
    </section>`,
};
export const ReadingSizes: Story = {
  render: () =>
    html`<section class="t-prose">
      <h2>Room to read</h2>
      <p class="t-text-small">Small · Supporting information, timestamps, and brief notes.</p>
      <p class="t-text-medium">Medium · The default for paragraphs and everyday content.</p>
      <p class="t-text-large">Large · Prominent text that needs more space.</p>
      <p class="t-lead">Lead text introduces the page without adding a heading level.</p>
      <p class="t-muted">Muted text remains readable in every shipped palette.</p>
    </section>`,
};
export const InlineElements: Story = {
  render: () =>
    html`<section class="t-prose">
      <h2>Details with meaning</h2>
      <p><strong>Strong importance</strong> and <em>spoken emphasis</em> use native elements.</p>
      <p><mark>Highlighted information</mark> has a matching foreground and background.</p>
      <p>Set <code>data-theme="phosphor"</code>. The response is <samp>READY</samp>.</p>
      <p>Use <kbd>Ctrl</kbd> + <kbd>K</kbd> for a keyboard shortcut in your application.</p>
      <p>
        Application programming interface (<abbr title="Application programming interface">API</abbr
        >) is written out on first use.
      </p>
      <p>
        <del>Previous wording</del> <ins>Updated wording</ins>. Water is H<sub>2</sub>O. Area is
        measured in m<sup>2</sup>.
      </p>
      <p><small>Small print still needs readable contrast.</small></p>
    </section>`,
};
export const Links: Story = {
  render: () =>
    html`<section class="t-prose">
        <h2>Go somewhere useful</h2>
        <p>
          Native links have
          <a href="#link-destination">persistent underlines and keyboard focus</a>.
        </p>
        <p>
          <a href="https://example.com" target="_blank" rel="noopener noreferrer"
            >Example site (opens in a new tab)</a
          >
        </p>
        <p><a>An anchor without a destination is ordinary text.</a></p>
        <p>
          <t-link href="#link-destination"
            ><t-icon slot="start" name="file"></t-icon>Link component with an icon</t-link
          >
        </p>
        <h3 id="link-destination">A real destination</h3>
      </section>
      <p class="t-text"><a class="t-link" href="#link-destination">Standalone native link</a></p>`,
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', {
      name: 'persistent underlines and keyboard focus',
    });
    link.focus();
    await userEvent.keyboard('{Tab}');
    await expect(
      within(canvasElement).getByRole('link', { name: 'Example site (opens in a new tab)' }),
    ).toHaveFocus();
  },
};
export const ListsAndQuotes: Story = {
  render: () =>
    html`<article class="t-prose">
      <h2>Prepare the workspace</h2>
      <ol>
        <li>Review the requirements.</li>
        <li>
          Choose a palette.
          <ul>
            <li>Amber for warm interfaces.</li>
            <li>Paper for a light surface.</li>
          </ul>
        </li>
        <li>Check the complete workflow.</li>
      </ol>
      <dl>
        <dt>Workspace</dt>
        <dd>The current editing area.</dd>
        <dt>Signal</dt>
        <dd>The status reported by the application.</dd>
      </dl>
      <blockquote>
        <p>Keep the information clear, even when the interface has character.</p>
        <footer>— <cite>Hullframe design notes</cite></footer>
      </blockquote>
      <figure>
        <p>▁ ▂ ▄ ▃ ▆ ▅ ▇ <span class="t-muted">Signal rising</span></p>
        <figcaption>Include a text description for a visual pattern.</figcaption>
      </figure>
    </article>`,
};
export const CodeBlocks: Story = {
  render: () =>
    html`<section class="t-prose">
      <h2>Commands stay intact</h2>
      <p>This block scrolls horizontally on narrow screens. It has a name and a keyboard stop.</p>
      <pre
        tabindex="0"
        role="region"
        aria-label="Connection command"
      ><code>terminal connect --workspace orbital --profile engineering --output human-readable --read-only
status: ready</code></pre>
      <p>For logs that should wrap:</p>
      <pre
        style="white-space:pre-wrap;overflow-wrap:anywhere"
      ><samp>Signal received. The workspace is ready for a new session. This log wraps with the reading area.</samp></pre>
    </section>`,
};
export const ThemeComparison: Story = {
  render: () =>
    html`<div
      style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px"
    >
      ${['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper'].map(
        (theme) =>
          html`<section
            data-theme=${theme}
            class="t-prose"
            style="background:var(--t-bg);padding:20px;border:1px solid var(--t-border)"
          >
            <p class="t-eyebrow">${theme}</p>
            <h2 class="t-h3">A clear signal</h2>
            <p>
              Readable text with <strong>emphasis</strong>, <mark>highlights</mark>, and
              <a href="#theme-${theme}">a visible link</a>.
            </p>
            <p id="theme-${theme}" class="t-muted t-text-small">
              Secondary information stays readable.
            </p>
          </section>`,
      )}
    </div>`,
};
export const RightToLeft: Story = {
  render: () =>
    html`<article class="t-prose" lang="ar" dir="rtl">
      <h2>دليل الاستخدام</h2>
      <p>نص واضح وروابط سهلة القراءة في جميع الألوان.</p>
      <ul>
        <li>اختر الألوان المناسبة.</li>
        <li>راجع المعلومات قبل المتابعة.</li>
      </ul>
      <blockquote><p>تبقى المعلومات واضحة في كل اتجاه.</p></blockquote>
      <p><a href="#rtl-notes">اقرأ الملاحظات</a></p>
      <h3 id="rtl-notes">الملاحظات</h3>
    </article>`,
};
export const TokenOverrides: Story = {
  render: () =>
    html`<article
      class="t-prose"
      style="--t-prose-width:50ch;--t-heading-1:2.5rem;--t-text-leading:1.9"
    >
      <h1>A quieter reading area</h1>
      <p>
        Set a narrower measure, a smaller page title, and more space between lines with inherited
        CSS properties.
      </p>
      <p class="t-muted">
        The same typography tokens work in native HTML and every supported framework.
      </p>
    </article>`,
};
