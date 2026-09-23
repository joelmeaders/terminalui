import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect } from 'storybook/test';
import '../src/components/range';
const meta = {
  title: 'Forms/Range',
  component: 't-range',
  tags: ['autodocs'],
  args: {
    label: 'Signal level',
    value: '50',
    min: 0,
    max: 100,
    step: '10',
    disabled: false,
    help: 'Use arrow keys to change the level.',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Native slider with min, max, step and a string value. Native clamping and keyboard behavior are preserved. The current value is visible by default. Set the showValue property to false to hide it. Supports FormData, reset, and disabled fieldsets. CSS part: input.',
      },
    },
  },
  render: (a) =>
    html`<t-range
      label=${a.label}
      .value=${a.value}
      min=${a.min}
      max=${a.max}
      step=${a.step}
      ?disabled=${a.disabled}
      help=${a.help}
    ></t-range>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-range')!;
    host.value = '60';
    await host.updateComplete;
    await expect(host.shadowRoot!.querySelector('input')).toHaveValue('60');
  },
};
export const Disabled: Story = { args: { disabled: true } };
export const FineStep: Story = { args: { min: 0, max: 1, step: '0.1', value: '0.5' } };
