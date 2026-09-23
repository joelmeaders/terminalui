import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
const meta = {
  title: 'Components/Checkbox',
  component: 't-checkbox',
  tags: ['autodocs'],
  args: {
    label: 'System notifications',
    checked: false,
    disabled: false,
    switch: false,
    required: false,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Form-associated checkbox with optional switch presentation. `checked` controls the state. Checked controls contribute `value` (default `on`) to FormData. Emits `input` and `change`. CSS part: `input`.',
      },
    },
  },
  render: (a) =>
    html`<t-checkbox
      label=${a.label}
      .checked=${a.checked}
      ?disabled=${a.disabled}
      ?switch=${a.switch}
      ?required=${a.required}
    ></t-checkbox>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-checkbox')!;
    await userEvent.click(host.shadowRoot!.querySelector('input')!);
    await expect(host.checked).toBe(true);
  },
};
export const Checked: Story = { args: { checked: true } };
export const Switch: Story = { args: { switch: true, checked: true } };
export const Disabled: Story = { args: { disabled: true } };
