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
    await host.updateComplete;
    await expect(host.shadowRoot!.activeElement).toBeNull();
    await userEvent.click(host.shadowRoot!.querySelectorAll('input')[2]);
    await expect(host.value).toBe('production');
  },
};
export const Horizontal: Story = { args: { orientation: 'horizontal' } };
export const Required: Story = { args: { value: '', required: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = { args: { error: 'Choose an available environment.' } };
export const EmptyRequired: Story = {
  render: () =>
    html`<t-radio-group
      label="Environment"
      required
      help="No environments are available."
    ></t-radio-group>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-radio-group')!;
    await host.updateComplete;
    host.reportValidity();
    await host.updateComplete;
    await expect(host.shadowRoot!.activeElement).toBe(host.shadowRoot!.querySelector('fieldset'));
    await expect(host.shadowRoot!.querySelector('#help')).toHaveTextContent('Select an option.');
  },
};
export const LiveOptions: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-radio-group')!;
    await host.updateComplete;
    host.focus();
    const focused = host.shadowRoot!.activeElement;
    host.options = [...options].reverse();
    await host.updateComplete;
    await expect(host.shadowRoot!.activeElement).toBe(focused);
    await expect(host.value).toBe('test');
  },
};
