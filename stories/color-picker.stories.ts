import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/color-picker';
const swatches = [
  { value: '#f5ba5b', label: 'Amber' },
  { value: '#69d391', label: 'Green' },
  { value: '#7dc8ef', label: 'Blue' },
];
const meta = {
  title: 'Forms/Color picker',
  component: 't-color-picker',
  tags: ['autodocs'],
  args: {
    label: 'Accent color',
    value: '#f5ba5b',
    disabled: false,
    readonly: false,
    required: false,
    error: '',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Native color chooser paired with an editable hexadecimal field. value accepts #rrggbb; an empty value is allowed unless required. Invalid text stays visible and fails constraint validation. swatches accepts {value,label?} objects with named buttons; invalid preset colors are ignored. Supports readonly, disabled fieldsets, standard events, FormData, reset and custom errors.',
      },
    },
  },
  render: (a) =>
    html`<t-color-picker
      label=${a.label}
      .value=${a.value}
      .swatches=${swatches}
      ?disabled=${a.disabled}
      ?readonly=${a.readonly}
      ?required=${a.required}
      error=${a.error}
    ></t-color-picker>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-color-picker')!;
    await userEvent.click(host.shadowRoot!.querySelectorAll('button')[1]);
    await expect(host.value).toBe('#69d391');
  },
};
export const Disabled: Story = { args: { disabled: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Required: Story = { args: { required: true, value: '' } };
export const Invalid: Story = {
  args: { value: 'orange', error: 'Enter a six-digit hexadecimal color.' },
};
