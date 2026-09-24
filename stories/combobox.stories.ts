import '../src/components/icon';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/combobox';
const options = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta', disabled: true },
  { value: 'charlie', label: 'Charlie' },
];
const meta = {
  title: 'Forms/Combobox',
  component: 't-combobox',
  tags: ['autodocs'],
  args: {
    label: 'Destination',
    value: '',
    disabled: false,
    required: false,
    loading: false,
    error: '',
    options,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Searchable single select. Set options to {value, label, disabled?} objects. Arrow keys skip disabled choices. Enter selects, Escape closes, and Tab leaves the field. Only an enabled option submits. Unmatched text fails validation. Replace options when asynchronous data arrives. loading announces progress; no network requests are made. Parts: input, listbox, option.',
      },
    },
  },
  render: (a) =>
    html`<t-combobox
      label=${a.label}
      .value=${a.value}
      .options=${a.options}
      ?disabled=${a.disabled}
      ?required=${a.required}
      ?loading=${a.loading}
      error=${a.error}
    ></t-combobox>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-combobox')!;
    await userEvent.click(host.shadowRoot!.querySelector('input')!);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    await expect(host.value).toBe('charlie');
  },
};
export const Empty: Story = { args: { options: [] } };
export const Loading: Story = { args: { options: [], loading: true } };
export const Disabled: Story = { args: { disabled: true, value: 'alpha' } };
export const Invalid: Story = { args: { required: true, error: 'Choose a destination.' } };
export const AsyncOptions: Story = {
  args: { options: [], loading: true },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-combobox')!;
    await userEvent.click(host.shadowRoot!.querySelector('input')!);
    await expect(host.shadowRoot!.querySelector('[role=status]')).toHaveTextContent(
      'Loading options',
    );
    host.options = options;
    host.loading = false;
    await host.updateComplete;
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(host.value).toBe('alpha');
  },
};

export const WithSlots: Story = {
  render: () =>
    html`<t-combobox
      label="Department"
      .options=${[
        { value: 'archive', label: 'Archive' },
        { value: 'engineering', label: 'Engineering' },
      ]}
      ><t-icon slot="start" name="search"></t-icon
    ></t-combobox>`,
};
