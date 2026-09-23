import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/divider';
const meta = {
  title: 'Components/Divider',
  component: 't-divider',
  tags: ['autodocs'],
  args: { vertical: false },
  render: (a) =>
    html`<div
      style=${a.vertical ? 'display:flex;gap:20px;min-height:64px;align-items:center' : 'max-width:360px'}
    >
      <span>Overview</span><t-divider ?vertical=${a.vertical}></t-divider><span>Details</span>
    </div>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Horizontal: Story = {};
export const Vertical: Story = { args: { vertical: true } };
