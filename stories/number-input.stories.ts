import '../src/components/icon';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/number-input';
const meta = {
  title: 'Forms/Number input',
  component: 't-number-input',
  tags: ['autodocs'],
  args: {
    label: 'Worker count',
    value: '2',
    min: '0',
    max: '10',
    step: '2',
    disabled: false,
    readonly: false,
    error: '',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Native number field with accessible Decrease/Increase buttons. Inherits min, max, step and required validation. value is a string. stepUp(count) and stepDown(count) use native stepping; step=any adjusts by one. Buttons stop at bounds and return focus to the input if the focused button becomes disabled. Supports native FormData and reset.',
      },
    },
  },
  render: (a) =>
    html`<t-number-input
      label=${a.label}
      .value=${a.value}
      min=${a.min}
      max=${a.max}
      step=${a.step}
      ?disabled=${a.disabled}
      ?readonly=${a.readonly}
      error=${a.error}
    ></t-number-input>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-number-input')!;
    await userEvent.click(host.shadowRoot!.querySelector('[part=increase]')!);
    await expect(host.value).toBe('4');
  },
};
export const Decimal: Story = { args: { value: '0.5', min: '0', max: '1', step: '0.1' } };
export const Disabled: Story = { args: { disabled: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Invalid: Story = { args: { value: '3', error: 'Choose an even number.' } };

export const WithSlots: Story = {
  render: () =>
    html`<t-number-input label="Budget (USD)" value="50" min="0" step="5"
      ><span slot="end">USD</span></t-number-input
    >`,
};
