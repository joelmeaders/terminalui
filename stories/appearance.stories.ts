import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, within } from 'storybook/test';

const sample = () =>
  html` <t-card>
    <span slot="heading">Display calibration</span>
    <div style="display:grid;gap:20px">
      <t-input label="Station" value="EXPLORER-01"></t-input>
      <t-progress value="68" label="Signal strength"></t-progress>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <t-button variant="secondary">Initialize</t-button>
        <t-badge variant="success">Operational</t-badge>
        <t-checkbox label="Telemetry" switch checked></t-checkbox>
      </div>
    </div>
  </t-card>`;

const meta = {
  title: 'Introduction/Appearance',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Set theme, density, lines, glow, scanlines, and motion on html, body, or a region. Each setting inherits independently, and the nearest override wins. These stories demonstrate local overrides. The Inheritance guide explains page defaults, nested regions, CSS tokens, frameworks, and accessibility preferences.',
      },
    },
  },
  args: { lines: 'standard', glow: 'off', scanlines: 'off' },
  argTypes: {
    lines: { control: 'select', options: ['standard', 'bold'] },
    glow: { control: 'select', options: ['off', 'subtle', 'strong'] },
    scanlines: { control: 'select', options: ['off', 'subtle', 'pronounced'] },
  },
  render: ({ lines, glow, scanlines }) =>
    html` <section
      class="t-screen"
      data-lines=${lines}
      data-glow=${glow}
      data-scanlines=${scanlines}
      style="max-width:600px;padding:20px"
    >
      ${sample()}
    </section>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;

export const Base: Story = {};
export const Bold: Story = { args: { lines: 'bold' } };
export const Phosphor: Story = {
  args: { lines: 'bold', glow: 'subtle', scanlines: 'subtle' },
  globals: { theme: 'phosphor' },
};
export const Strong: Story = { args: { glow: 'strong', scanlines: 'pronounced' } };
export const ScopedScreens: Story = {
  render: () =>
    html` <div data-lines="bold" data-glow="subtle" style="display:grid;gap:24px;max-width:600px">
      <section class="t-screen" data-scanlines="pronounced" style="padding:20px">
        ${sample()}
        <section class="t-screen" data-scanlines="subtle">
          <p>This nested screen overrides the inherited texture with subtle scanlines.</p>
        </section>
      </section>
      <section data-lines="standard" data-glow="off">
        <t-input
          label="Clear editing area"
          help="Local line and glow overrides. No scanline surface."
        ></t-input>
      </section>
    </div>`,
};
export const CascadingSettings: Story = {
  render: () =>
    html` <article
      class="t-screen t-prose"
      data-theme="phosphor"
      data-density="compact"
      data-lines="bold"
      data-glow="subtle"
      data-scanlines="pronounced"
      data-motion="off"
      style="padding:clamp(8px,2vw,24px);max-width:800px"
    >
      <h2 class="t-h3">One region. Inherited settings.</h2>
      <p>Phosphor · compact · bold · subtle glow · pronounced scanlines · motion off</p>
      <t-button variant="secondary">Inherited action</t-button>
      <section
        class="t-screen"
        data-theme="paper"
        data-density="comfortable"
        data-lines="standard"
        data-glow="off"
        data-scanlines="off"
        style="margin-block:24px;padding:clamp(8px,2vw,20px)"
      >
        <h3 class="t-h4">A clear editing region</h3>
        <p>Paper · comfortable · standard · no glow or scanlines. Motion still inherits off.</p>
        <t-input label="Operator" value="EXPLORER-01"></t-input>
        <section
          class="t-screen"
          data-theme="amber"
          data-density="compact"
          data-scanlines="subtle"
          style="margin-block-start:20px;padding:clamp(8px,2vw,20px)"
        >
          <h4 class="t-h5">A deeper override</h4>
          <p>
            Amber and compact again. Standard lines, glow off, and motion off still inherit. Only
            this surface restores subtle scanlines.
          </p>
          <t-button variant="secondary">Nested action</t-button>
        </section>
      </section>
      <t-button variant="secondary">Sibling action</t-button>
      <p class="t-text-small">
        The sibling retains the outer settings. Use the same attributes on html or body for page
        defaults.
      </p>
    </article>`,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inherited = canvas.getByText('Inherited action').shadowRoot!.querySelector('button')!;
    const nested = canvas.getByText('Nested action').shadowRoot!.querySelector('button')!;
    await expect(getComputedStyle(inherited).borderTopWidth).toBe('2px');
    await expect(getComputedStyle(nested).borderTopWidth).toBe('1px');
    await expect(getComputedStyle(nested).minHeight).toBe('34px');
    await expect(getComputedStyle(nested).transitionDuration).toBe('0s, 0s');
  },
};
export const CRTPreset: Story = {
  render: () =>
    html`<section class="t-screen" data-effects="crt" style="max-width:600px;padding:20px">
      ${sample()}
    </section>`,
};
