import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/rating';
const meta = {
  title: 'Forms/Rating',
  component: 't-rating',
  tags: ['autodocs'],
  args: {
    label: 'Experience',
    value: '',
    max: 5,
    clearable: true,
    required: false,
    disabled: false,
    error: '',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Native radio rating with named choices such as 3 of 5 stars. value is an integer string; empty string means unrated. max is clamped to 1–10. clearable adds a named clear action, and clear() removes the rating. A required rating fails validation after clearing. Supports arrows, FormData, reset, and disabled fieldsets.',
      },
    },
  },
  render: (a) =>
    html`<t-rating
      label=${a.label}
      .value=${a.value}
      max=${a.max}
      ?clearable=${a.clearable}
      ?required=${a.required}
      ?disabled=${a.disabled}
      error=${a.error}
    ></t-rating>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-rating')!;
    await host.updateComplete;
    await expect(host.shadowRoot!.activeElement).toBeNull();
    await userEvent.click(host.shadowRoot!.querySelectorAll('input')[3]);
    await expect(host.value).toBe('4');
    await userEvent.click(host.shadowRoot!.querySelector('button')!);
    await expect(host.value).toBe('');
  },
};
export const Selected: Story = { args: { value: '4' } };
export const Disabled: Story = { args: { value: '3', disabled: true } };
export const Required: Story = { args: { required: true } };
export const Invalid: Story = { args: { error: 'Select a rating before you continue.' } };
export const LiveMaximum: Story = {
  args: { value: '4', required: true },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-rating')!;
    await host.updateComplete;
    host.focus();
    host.max = 2;
    await host.updateComplete;
    await expect(host.shadowRoot!.activeElement).toBe(
      host.shadowRoot!.querySelector('input[value="2"]'),
    );
    await expect(host.value).toBe('4');
    await expect(host.validity.valueMissing).toBe(true);
  },
};
