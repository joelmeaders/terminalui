import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent, fn } from 'storybook/test';
const meta = {
  title: 'Components/Button',
  component: 't-button',
  tags: ['autodocs'],
  args: {
    label: 'Initialize',
    variant: 'primary',
    size: 'medium',
    disabled: false,
    loading: false,
    onClick: fn(),
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['small', 'medium', 'large'] },
    onClick: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Action button with native keyboard behavior. Use a native `<button class="t-native" type="submit">` for forms. Slots: default label. CSS part: `button`. Events: native `click`.',
      },
    },
  },
  render: (a) =>
    html`<t-button
      variant=${a.variant}
      size=${a.size}
      ?disabled=${a.disabled}
      ?loading=${a.loading}
      @click=${a.onClick}
      >${a.label}</t-button
    >`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Primary: Story = {
  play: async ({ canvasElement, args }) => {
    const button = canvasElement.querySelector('t-button')!.shadowRoot!.querySelector('button')!;
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Danger: Story = { args: { variant: 'danger', label: 'Discard' } };
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('t-button')!.shadowRoot!.querySelector('button'),
    ).toBeDisabled();
  },
};
export const Loading: Story = { args: { loading: true, label: 'Processing' } };
