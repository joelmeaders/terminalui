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
          'Searchable single select. Set options to {value, label, disabled?} objects. Arrow keys skip disabled choices. Enter selects, Escape closes, and Tab leaves the field. Only an enabled option submits. Unmatched text fails validation. Replace options when asynchronous data arrives. loading announces progress. The component makes no network requests. Parts: input, listbox, option.',
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
export const Empty: Story = {
  args: { options: [] },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-combobox')!;
    const input = host.shadowRoot!.querySelector('input')!;
    await userEvent.click(input);
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await expect(input).not.toHaveAttribute('aria-controls');
    await expect(host.shadowRoot!.querySelector('[role=status]')).toHaveTextContent(
      'No options found.',
    );
    await expect(host.shadowRoot!.activeElement).toBe(input);
  },
};
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

const reports = [
  'environmental_readings_2026_09_26_sector17_revision3.json',
  'atmospheric_sensor_calibration_2026_09_26_laboratory_analysis.json',
  'laboratory_validation_2026_09_26_atmospheric_sample_results.json',
  'archive_environmental_sample_summary_2026_09_26_sector17.json',
];
export const LongLabels: Story = {
  render: () =>
    html`<section style="max-width:320px;min-height:320px">
      <p>Use the arrow keys to browse saved reports. Enter selects a report.</p>
      <t-combobox
        label="Saved report"
        .options=${reports.map((label, index) => ({ value: `report-${index}`, label, disabled: index === 1 }))}
      ></t-combobox>
    </section>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-combobox')!;
    const input = host.shadowRoot!.querySelector('input')!;
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{End}');
    await expect(host.shadowRoot!.activeElement).toBe(input);
    await expect(input).toHaveAttribute('aria-activedescendant', 'option-3');
    const list = host.shadowRoot!.querySelector<HTMLElement>('[role=listbox]')!;
    await expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth + 1);
    await expect(host.value).toBe('');
  },
};
