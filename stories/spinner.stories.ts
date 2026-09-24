import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/spinner';
import type { SpinnerType } from '../src/components/spinner';
import spinnerGuide from '../docs/spinners.md?raw';
const modern: SpinnerType[] = ['ring', 'dots', 'bars', 'pulse', 'orbit'];
const terminal: SpinnerType[] = ['cursor', 'cursor-box', 'arrow', 'pixels', 'blocks'];
const gallery = (types: SpinnerType[], steps = 8) =>
  html` <div style="display:flex;flex-wrap:wrap;gap:32px;align-items:start">
    ${types.map(
      (type) =>
        html`<div style="display:grid;justify-items:center;gap:16px;min-width:80px">
          <t-spinner
            type=${type}
            size="large"
            steps=${steps}
            label=${`Loading example: ${type}`}
          ></t-spinner>
          <code>${type}</code>
        </div>`,
    )}
  </div>`;
const meta = {
  title: 'Components/Spinner',
  component: 't-spinner',
  tags: ['autodocs'],
  args: { label: 'Loading records', size: 'medium', type: 'ring', steps: 8 },
  argTypes: {
    size: { control: 'select', options: ['small', 'medium', 'large'] },
    type: { control: 'select', options: [...modern, ...terminal] },
    steps: {
      control: 'inline-radio',
      options: [6, 8],
      description: 'Fixed positions for the arrow type.',
    },
  },
  parameters: { docs: { description: { component: spinnerGuide.replace(/^# .+\n/, '') } } },
  render: (a) =>
    html`<t-spinner
      label=${a.label}
      size=${a.size}
      type=${a.type}
      .steps=${a.steps as 6 | 8}
    ></t-spinner>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {};
export const Small: Story = { args: { size: 'small' } };
export const Large: Story = { args: { size: 'large' } };
export const Dots: Story = { args: { type: 'dots' } };
export const Bars: Story = { args: { type: 'bars' } };
export const Pulse: Story = { args: { type: 'pulse' } };
export const Orbit: Story = { args: { type: 'orbit' } };
export const Cursor: Story = { args: { type: 'cursor' } };
export const CursorBox: Story = { args: { type: 'cursor-box' } };
export const SteppedArrow: Story = { args: { type: 'arrow', size: 'large' } };
export const SixPointArrow: Story = { args: { type: 'arrow', steps: 6, size: 'large' } };
export const Pixels: Story = { args: { type: 'pixels' } };
export const Blocks: Story = { args: { type: 'blocks' } };
export const ModernStyles: Story = { render: () => gallery(modern) };
export const TerminalStyles: Story = { render: () => gallery(terminal) };
export const MotionOff: Story = {
  globals: { motion: 'off' },
  render: () => gallery([...modern, ...terminal]),
};
export const NestedMotion: Story = {
  render: () =>
    html`<section data-motion="off">
      <p>Motion disabled for this region</p>
      ${gallery(terminal)}
      <section data-motion="auto">
        <p>Nested region follows the device preference</p>
        ${gallery(terminal)}
      </section>
    </section>`,
};
