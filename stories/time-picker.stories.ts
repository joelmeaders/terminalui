import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/time-picker';

const meta = {
  title: 'Forms/Time Picker',
  component: 't-time-picker',
  tags: ['autodocs'],
  args: {
    name: 'launch',
    label: 'Launch time',
    value: '09:30',
    min: '',
    max: '',
    required: false,
    invalid: false,
    disabled: false,
    readonly: false,
  },
  parameters: {
    docs: {
      description: {
        component:
          'A form-associated 24-hour time field. Type HH:mm or use the native hour and minute choices in its modal. Required and min/max values validate the submitted string. Cancel and Escape discard a draft. Use time emits input, change, and t-change when the value changes.',
      },
    },
  },
  render: (args) =>
    html`<t-time-picker
      name=${args.name}
      label=${args.label}
      value=${args.value}
      min=${args.min}
      max=${args.max}
      ?required=${args.required}
      ?invalid=${args.invalid}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
    ></t-time-picker>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const picker = canvasElement.querySelector('t-time-picker')!;
    const trigger = picker.shadowRoot!.querySelector<HTMLButtonElement>('.trigger')!;
    await userEvent.click(trigger);
    const hours = picker.shadowRoot!.querySelector<HTMLSelectElement>('#hours')!;
    const minutes = picker.shadowRoot!.querySelector<HTMLSelectElement>('#minutes')!;
    await userEvent.selectOptions(hours, '10');
    await userEvent.selectOptions(minutes, '45');
    await userEvent.click(picker.shadowRoot!.querySelector<HTMLButtonElement>('.apply')!);
    await expect(picker.value).toBe('10:45');
    await expect((trigger.getRootNode() as ShadowRoot).activeElement).toBe(trigger);
  },
};
export const Empty: Story = { args: { value: '', required: true } };
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const picker = canvasElement.querySelector('t-time-picker')!;
    picker.show();
    await picker.updateComplete;
    const dialog = picker.shadowRoot!.querySelector('t-dialog')!;
    await dialog.updateComplete;
    await expect(dialog.shadowRoot!.querySelector('dialog')!.open).toBe(true);
  },
};
export const Bounded: Story = { args: { min: '09:15', max: '17:45', required: true } };
export const Invalid: Story = { args: { value: '25:90', invalid: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Readonly: Story = { args: { readonly: true } };
