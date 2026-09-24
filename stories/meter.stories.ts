import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/meter';
const meta = {
  title: 'Data/Meter',
  component: 't-meter',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Native scalar measurement for a known range. `min`, `max`, `value`, `low`, `high`, and `optimum` map to the native meter. Values and thresholds are clamped. `value-text` provides a formatted visible value and `aria-valuetext`. Use `t-progress` for task progress. Native meter appearance varies by browser and respects system rendering.',
      },
    },
  },
  render: () =>
    html`<t-meter
      label="Storage used"
      value="42"
      value-text="42 GB of 100 GB"
      low="60"
      high="85"
      optimum="20"
    ></t-meter>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {};
export const NearLimit: Story = {
  render: () =>
    html`<t-meter
      label="Storage used"
      value="93"
      value-text="93 GB of 100 GB"
      low="60"
      high="85"
      optimum="20"
    ></t-meter>`,
};
export const CustomRange: Story = {
  render: () =>
    html`<t-meter
      label="Temperature"
      min="-20"
      max="50"
      value="18"
      value-text="18 degrees Celsius"
      low="0"
      high="30"
      optimum="20"
    ></t-meter>`,
};
