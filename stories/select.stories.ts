import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/select';
const options = [
  { value: '', label: 'Choose a destination' },
  { value: 'web', label: 'Website' },
  { value: 'app', label: 'Application' },
  { value: 'restricted', label: 'Restricted', disabled: true },
];
const meta = {
  title: 'Components/Select',
  component: 't-select',
  tags: ['autodocs'],
  args: { label: 'Destination', value: '', disabled: false, required: false, error: '' },
  parameters: {
    docs: {
      description: {
        component:
          'Native select with an `options` JavaScript property: `{value, label, disabled?}[]`. Form-associated. Emits `input` and `change`. Supports `name`, `value`, `required`, `disabled`, `help`, `error`, reset, and FormData. CSS part: `select`.',
      },
    },
  },
  render: (a) =>
    html`<t-select
      label=${a.label}
      .options=${options}
      .value=${a.value}
      ?disabled=${a.disabled}
      ?required=${a.required}
      error=${a.error}
    ></t-select>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-select')!;
    await userEvent.selectOptions(host.shadowRoot!.querySelector('select')!, 'app');
    await expect(host.value).toBe('app');
  },
};
export const Selected: Story = { args: { value: 'web' } };
export const Required: Story = { args: { required: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = { args: { error: 'Choose a destination.' } };
export const ReactiveOptions: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-select')!;
    host.options = [{ value: 'new', label: 'New destination' }];
    host.value = 'new';
    await host.updateComplete;
    await expect(host.shadowRoot!.querySelector('select')).toHaveValue('new');
  },
};
