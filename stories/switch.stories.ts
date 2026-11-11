import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/switch';
const meta = {
  title: 'Forms/Switch',
  component: 't-switch',
  tags: ['autodocs'],
  args: { label: 'Enable alerts', checked: false, disabled: false, required: false, error: '' },
  parameters: {
    docs: {
      description: {
        component:
          'Native checkbox with switch presentation and the switch role. The checked property controls state. A checked switch submits its value (default on). An unchecked switch submits nothing. Supports required, reset, and disabled fieldsets. Emits composed input/change events. CSS part: input.',
      },
    },
  },
  render: (a) =>
    html`<t-switch
      label=${a.label}
      .checked=${a.checked}
      ?disabled=${a.disabled}
      ?required=${a.required}
      error=${a.error}
    ></t-switch>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-switch')!;
    await userEvent.click(host.shadowRoot!.querySelector('input')!);
    await expect(host.checked).toBe(true);
  },
};
export const Checked: Story = { args: { checked: true } };
export const Disabled: Story = { args: { disabled: true, checked: true } };
export const Invalid: Story = { args: { required: true, error: 'Enable alerts to continue.' } };
