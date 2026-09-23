import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/grid';
const meta = {
  title: 'Layout/Grid',
  component: 't-grid',
  tags: ['autodocs'],
  args: { columns: 0 },
  render: (a) =>
    html`<t-grid .columns=${a.columns}
      >${['Navigation', 'Documents', 'Activity'].map((name) => html`<t-card><span slot="heading">${name}</span>Responsive content area.</t-card>`)}</t-grid
    >`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Responsive: Story = {};
export const TwoColumns: Story = { args: { columns: 2 } };
export const ThreeColumns: Story = { args: { columns: 3 } };
