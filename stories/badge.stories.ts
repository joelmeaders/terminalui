import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
const meta = {
  title: 'Components/Badge',
  component: 't-badge',
  tags: ['autodocs'],
  args: { variant: 'neutral', label: 'Standby' },
  argTypes: {
    variant: { control: 'select', options: ['neutral', 'accent', 'success', 'warning', 'danger'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Compact status label. Always provide meaningful text. Color is supplementary. CSS part: `badge`.',
      },
    },
  },
  render: (a) => html`<t-badge variant=${a.variant}>${a.label}</t-badge>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {};
export const Success: Story = { args: { variant: 'success', label: 'Operational' } };
export const Warning: Story = { args: { variant: 'warning', label: 'Limited' } };
export const Danger: Story = { args: { variant: 'danger', label: 'Offline' } };
