import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/icon-button';
import { expect, userEvent, fn } from 'storybook/test';
const meta = {
  title: 'Components/Icon button',
  component: 't-icon-button',
  tags: ['autodocs'],
  args: {
    name: 'settings',
    label: 'Settings',
    disabled: false,
    pressed: null as boolean | null,
    onClick: fn(),
  },
  render: (a) =>
    html`<t-icon-button
      name=${a.name}
      label=${a.label}
      ?disabled=${a.disabled}
      .pressed=${a.pressed}
      @click=${a.onClick}
    ></t-icon-button>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      canvasElement.querySelector('t-icon-button')!.shadowRoot!.querySelector('button')!,
    );
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
export const Disabled: Story = { args: { disabled: true } };
export const Toggle: Story = { args: { name: 'eye', label: 'Preview', pressed: true } };
