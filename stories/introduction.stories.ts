import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
const meta = {
  title: 'Introduction/Start here',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Terminal Kit is a Lit proof of concept with 12 components and six themes. Choose palette, density, line weight, glow, and scanlines from the toolbar. The Appearance stories show presets and local overrides. See the repository README for browser, React, Vue, and Angular examples and the POC limitations.',
      },
    },
  },
  render: () =>
    html`<h1 style="color:var(--t-accent);font-size:32px;font-weight:400">TERMINAL / KIT</h1>
      <p>Modern controls. Analog character.</p>
      <p>12 components · 6 themes · Lit 3 · standard HTML forms</p>
      <t-alert
        >Choose a component in the sidebar. Use Controls to adjust its properties. Use the toolbar
        to compare themes.</t-alert
      >
      <h2 style="font-size:18px;margin-top:32px">Browser usage</h2>
      <pre style="white-space:pre-wrap">
&lt;link rel="stylesheet" href="./dist/themes.css"&gt;
&lt;script type="module" src="./dist/terminal.js"&gt;&lt;/script&gt;
&lt;t-button&gt;Initialize&lt;/t-button&gt;</pre>
      <h2 style="font-size:18px">Accessibility</h2>
      <p>
        Native controls, explicit labels, visible focus, keyboard navigation, and reduced motion
        support. Automated checks do not replace screen-reader testing.
      </p>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Welcome: Story = {};
