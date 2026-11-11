import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/date-range-picker';

const meta = {
  title: 'Forms/Date Range Picker',
  component: 't-date-range-picker',
  tags: ['autodocs'],
  args: {
    name: 'mission',
    label: 'Mission window',
    value: '2026-09-24/2026-10-01',
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
          'Type two YYYY-MM-DD dates or choose a start and end in one modal calendar. The form value is a slash-separated interval, such as 2026-09-24/2026-10-01. Calendar choices remain a draft until both days are selected. Escape cancels the draft. Bounds, date order, required state, and form reset use native form behavior.',
      },
    },
  },
  render: (args) =>
    html`<t-date-range-picker
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
    ></t-date-range-picker>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const picker = canvasElement.querySelector('t-date-range-picker')!;
    const trigger = picker.shadowRoot!.querySelector<HTMLButtonElement>('.trigger')!;
    await userEvent.click(trigger);
    const calendar = picker.shadowRoot!.querySelector('t-calendar')!;
    const day = (value: string) =>
      calendar.shadowRoot!.querySelector<HTMLButtonElement>(`[data-date="${value}"]`)!;
    await userEvent.click(day('2026-10-03'));
    await expect(picker.value).toBe('2026-09-24/2026-10-01');
    await userEvent.click(day('2026-10-05'));
    await expect(picker.value).toBe('2026-10-03/2026-10-05');
    await expect((trigger.getRootNode() as ShadowRoot).activeElement).toBe(trigger);
  },
};
export const Empty: Story = { args: { value: '' } };
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const picker = canvasElement.querySelector('t-date-range-picker')!;
    picker.show();
    await picker.updateComplete;
    const dialog = picker.shadowRoot!.querySelector('t-dialog')!;
    await dialog.updateComplete;
    await expect(dialog.shadowRoot!.querySelector('dialog')!.open).toBe(true);
  },
};
export const Bounded: Story = { args: { min: '2026-09-20', max: '2026-10-10', required: true } };
export const Invalid: Story = { args: { value: '2026-10-02/2026-10-01', invalid: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Readonly: Story = { args: { readonly: true } };
export const SameDay: Story = { args: { value: '2026-09-24/2026-09-24' } };
