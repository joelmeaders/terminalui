import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/copy-button';
const meta = {
  title: 'Components/Copy button',
  component: 't-copy-button',
  tags: ['autodocs'],
  args: { value: 'mission --status', label: 'Copy status command', disabled: false },
  render: (args) =>
    html`<t-copy-button
      .value=${args.value}
      .label=${args.label}
      ?disabled=${args.disabled}
    ></t-copy-button>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
