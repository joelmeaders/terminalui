import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
const meta = {
  title: 'Components/Progress',
  component: 't-progress',
  tags: ['autodocs'],
  args: { value: 68, max: 100, label: 'Resource allocation' },
  parameters: {
    docs: {
      description: {
        component:
          'Native progress element. Set `value` and `max` for determinate progress. Omit `value` for indeterminate work. Values are clamped to the range. CSS part: `progress`.',
      },
    },
  },
  render: (a) => html`<t-progress .value=${a.value} max=${a.max} label=${a.label}></t-progress>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {};
export const Complete: Story = { args: { value: 100 } };
export const Empty: Story = { args: { value: 0 } };
export const Indeterminate: Story = {
  render: () => html`<t-progress label="Connecting"></t-progress>`,
};
