import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/date-picker';

const meta = {
  title: 'Forms/Date Picker',
  component: 't-date-picker',
  tags: ['autodocs'],
  args: {
    name: 'mission',
    label: 'Mission date',
    value: '2026-09-24',
    min: '',
    max: '',
    locale: 'en-US',
    firstDayOfWeek: 0,
    required: false,
    invalid: false,
    disabled: false,
    readonly: false,
  },
  parameters: {
    docs: {
      description: {
        component:
          'A form-associated ISO date field with a modal calendar. Type YYYY-MM-DD or open the calendar. The field validates real dates, required values, and min/max bounds. Calendar selection emits input, change, and t-change. The dialog returns focus to its trigger on close.',
      },
    },
  },
  render: (args) =>
    html`<t-date-picker
      name=${args.name}
      label=${args.label}
      value=${args.value}
      min=${args.min}
      max=${args.max}
      locale=${args.locale}
      first-day-of-week=${args.firstDayOfWeek}
      ?required=${args.required}
      ?invalid=${args.invalid}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
    ></t-date-picker>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const picker = canvasElement.querySelector('t-date-picker')!;
    const trigger = picker.shadowRoot!.querySelector<HTMLButtonElement>('.trigger')!;
    await userEvent.click(trigger);
    const day = picker
      .shadowRoot!.querySelector('t-calendar')!
      .shadowRoot!.querySelector<HTMLButtonElement>('[data-date="2026-09-25"]')!;
    await userEvent.click(day);
    await expect(picker.value).toBe('2026-09-25');
    await expect((trigger.getRootNode() as ShadowRoot).activeElement).toBe(trigger);
  },
};
export const Empty: Story = { args: { value: '' } };
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const picker = canvasElement.querySelector('t-date-picker')!;
    picker.show();
    await picker.updateComplete;
    const dialog = picker.shadowRoot!.querySelector('t-dialog')!;
    await dialog.updateComplete;
    await expect(dialog.shadowRoot!.querySelector('dialog')!.open).toBe(true);
  },
};
export const Bounded: Story = { args: { min: '2026-09-20', max: '2026-10-10', required: true } };
export const Invalid: Story = { args: { value: '2026-02-30', invalid: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Readonly: Story = { args: { readonly: true } };
