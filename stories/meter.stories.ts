import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/meter';
const variants = ['solid', 'segmented-thin', 'segmented-thick'];
const sizes = ['small', 'medium', 'large'];
const meta = {
  title: 'Data/Meter',
  component: 't-meter',
  tags: ['autodocs'],
  args: {
    label: 'Storage used',
    value: 42,
    min: 0,
    max: 100,
    low: 60,
    high: 85,
    optimum: 20,
    valueText: '42 GB of 100 GB',
    variant: 'solid',
    size: 'small',
    animated: false,
  },
  argTypes: {
    variant: { control: 'select', options: variants },
    size: { control: 'select', options: sizes },
    animated: { control: 'boolean' },
  },
  render: (a) =>
    html`<t-meter
      label=${a.label}
      .value=${a.value}
      .min=${a.min}
      .max=${a.max}
      .low=${a.low}
      .high=${a.high}
      .optimum=${a.optimum}
      value-text=${a.valueText}
      variant=${a.variant}
      size=${a.size}
      ?animated=${a.animated}
    ></t-meter>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {};
export const ThinSegments: Story = { args: { variant: 'segmented-thin', size: 'medium' } };
export const ThickSegments: Story = { args: { variant: 'segmented-thick', size: 'large' } };
export const Sizes: Story = {
  render: () =>
    html`<div style="display:grid;gap:24px">
      ${sizes.map((size) => html`<t-meter label=${size} value="65" size=${size} variant="segmented-thick"></t-meter>`)}
    </div>`,
};
export const Styles: Story = {
  render: () =>
    html`<div style="display:grid;gap:24px">
      ${variants.map((variant) => html`<t-meter label=${variant} value="65" size="medium" variant=${variant}></t-meter>`)}
    </div>`,
};
export const Animated: Story = {
  args: { variant: 'segmented-thin', size: 'large', animated: true },
};
export const ViewportEntry: Story = {
  render: () =>
    html`<p>Scroll this preview to reveal the meter. Reload the story to replay.</p>
      <div
        role="region"
        aria-label="Viewport entry preview"
        tabindex="0"
        style="height:260px;overflow:auto;border:1px solid var(--t-control-border);padding:16px"
      >
        <p>One entrance per connection. Later scrolling does not replay it.</p>
        <div aria-hidden="true" style="height:320px"></div>
        <t-meter
          label="Oxygen reserve"
          value="82"
          value-text="82 percent"
          size="large"
          variant="segmented-thick"
          animated
          style="--t-meter-duration:1200ms"
        ></t-meter>
        <div aria-hidden="true" style="height:40px"></div>
      </div>`,
};
export const MotionOff: Story = {
  globals: { motion: 'off' },
  args: { variant: 'segmented-thick', size: 'large', animated: true },
};
export const RightToLeft: Story = {
  render: () =>
    html`<div dir="rtl">
      <t-meter
        label="Storage used"
        value="65"
        size="medium"
        variant="segmented-thin"
        animated
      ></t-meter>
    </div>`,
};
export const Empty: Story = {
  args: { value: 0, valueText: 'No storage used', variant: 'segmented-thin' },
};
export const Full: Story = {
  args: { value: 100, valueText: '100 GB of 100 GB', variant: 'segmented-thick', size: 'large' },
};
export const NearLimit: Story = { args: { value: 93, valueText: '93 GB of 100 GB' } };
export const CustomRange: Story = {
  args: {
    label: 'Temperature',
    min: -20,
    max: 50,
    value: 18,
    valueText: '18 degrees Celsius',
    low: 0,
    high: 30,
    optimum: 20,
    variant: 'segmented-thin',
    size: 'medium',
  },
};
