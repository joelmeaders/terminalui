import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/calendar';

const meta = {
  title: 'Data/Calendar',
  component: 't-calendar',
  tags: ['autodocs'],
  args: {
    label: 'Mission date',
    value: '2026-09-24',
    month: '2026-09',
    min: '',
    max: '',
    locale: 'en-US',
    firstDayOfWeek: 0,
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Inline single-date calendar with a seven-column keyboard grid. Choose a day with Enter, Space, or a pointer. Arrow keys move by day or week, Home/End move within a week, Page Up/Down move by month, and Shift+Page Up/Down move by year. min and max bound selection. The ISO value is not submitted by itself; pair the calendar with a date input for form submission. t-change reports { value }, and t-month-change reports { month }.',
      },
    },
  },
  render: (args) =>
    html`<t-calendar
      label=${args.label}
      value=${args.value}
      month=${args.month}
      min=${args.min}
      max=${args.max}
      locale=${args.locale}
      first-day-of-week=${args.firstDayOfWeek}
      ?disabled=${args.disabled}
    ></t-calendar>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const calendar = canvasElement.querySelector('t-calendar')!;
    const day = calendar.shadowRoot!.querySelector<HTMLButtonElement>('[data-date="2026-09-25"]')!;
    await userEvent.click(day);
    await expect(calendar.value).toBe('2026-09-25');
    await expect(calendar.shadowRoot!.querySelector('[aria-selected="true"]')).toContainElement(
      day,
    );
  },
};
export const NoSelection: Story = { args: { value: '' } };
export const Bounded: Story = {
  args: { min: '2026-09-20', max: '2026-10-10', firstDayOfWeek: 1 },
};
export const Disabled: Story = { args: { disabled: true } };
