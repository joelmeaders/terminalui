import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/multi-select';

const options = [
  { value: 'archive', label: 'Archive' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'operations', label: 'Operations' },
  { value: 'restricted', label: 'Restricted', disabled: true },
];
const meta = {
  title: 'Components/Multi Select',
  component: 't-multi-select',
  tags: ['autodocs'],
  args: {
    label: 'Departments',
    values: ['archive'],
    searchable: true,
    required: false,
    disabled: false,
    error: '',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Labeled native checkboxes with optional filtering. Set the `options` array and read `values`. Each selected value submits a separate FormData entry under `name`. The `value` string is a JSON array for attributes and form state restoration.',
      },
    },
  },
  render: (a) =>
    html`<t-multi-select
      name="departments"
      label=${a.label}
      .options=${options}
      .values=${a.values}
      ?searchable=${a.searchable}
      ?required=${a.required}
      ?disabled=${a.disabled}
      error=${a.error}
    ></t-multi-select>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-multi-select')!;
    await userEvent.click(host.shadowRoot!.querySelectorAll('.option')[1] as HTMLElement);
    await expect(host.values).toEqual(['archive', 'engineering']);
  },
};
export const Selected: Story = { args: { values: ['archive', 'operations'] } };
export const Required: Story = { args: { values: [], required: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = { args: { error: 'Choose an available department.' } };
export const WithoutFilter: Story = { args: { searchable: false } };
export const Empty: Story = {
  render: () =>
    html`<t-multi-select
      label="Departments"
      .options=${[]}
      empty-message="No departments available."
    ></t-multi-select>`,
};
export const Filtered: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-multi-select')!;
    await userEvent.type(host.shadowRoot!.querySelector('input[type="search"]')!, 'engine');
    await expect(host.shadowRoot!.querySelectorAll('.option')).toHaveLength(1);
    await expect(host.values).toEqual(['archive']);
  },
};
export const NoResults: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-multi-select')!;
    await userEvent.type(host.shadowRoot!.querySelector('input[type="search"]')!, 'unknown');
    await expect(host.shadowRoot!.querySelector('.empty')).toHaveTextContent('No options found.');
    await expect(host.values).toEqual(['archive']);
  },
};
export const ReactiveOptions: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-multi-select')!;
    host.options = [{ value: 'new', label: 'New department' }];
    host.values = ['new'];
    await host.updateComplete;
    await expect(host.shadowRoot!.querySelectorAll('.option')).toHaveLength(1);
    await expect(host.shadowRoot!.querySelector('input[type="checkbox"]')).toBeChecked();
  },
};
