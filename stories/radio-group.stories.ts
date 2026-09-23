import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/radio-group';
const options = [
  { value: 'test', label: 'Test' },
  { value: 'staging', label: 'Staging', disabled: true },
  { value: 'production', label: 'Production' },
];
const meta = {
  title: 'Forms/Radio group',
  component: 't-radio-group',
  tags: ['autodocs'],
  args: {
    label: 'Environment',
    value: 'test',
    required: false,
    disabled: false,
    orientation: 'vertical',
    error: '',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Single selection from an options property of {value, label, disabled?} objects. Uses native radio keys and a fieldset legend. Only enabled options submit. Supports required validation, reset, disabled fieldsets, and horizontal orientation. CSS part: input.',
      },
    },
  },
  render: (a) =>
    html`<t-radio-group
      label=${a.label}
      .value=${a.value}
      .options=${options}
      ?required=${a.required}
      ?disabled=${a.disabled}
      orientation=${a.orientation}
      error=${a.error}
    ></t-radio-group>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-radio-group')!;
    await userEvent.click(host.shadowRoot!.querySelectorAll('input')[2]);
    await expect(host.value).toBe('production');
  },
};
export const Horizontal: Story = { args: { orientation: 'horizontal' } };
export const Required: Story = { args: { value: '', required: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = { args: { error: 'Choose an available environment.' } };
