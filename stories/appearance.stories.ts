import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

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
          'Colors, line weight, glow, and density are independent inherited settings. These examples use local overrides, adjustable with Controls. A .t-screen surface paints scanlines once over its contents. Nested screens do not add another overlay when an ancestor screen already has texture. An overlay covers its entire region, so place clear content outside that region. The default appearance is unchanged. Effects are static and disappear in forced-colors mode.',
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
          <p>This nested screen uses the outer texture.</p>
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
export const CRTPreset: Story = {
  render: () =>
    html`<section class="t-screen" data-effects="crt" style="max-width:600px;padding:20px">
      ${sample()}
    </section>`,
};
