import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/empty-state';
const meta = {
  title: 'Components/Empty state',
  component: 't-empty-state',
  tags: ['autodocs'],
  args: {
    heading: 'No records found',
    description: 'Try a different search or create your first record.',
  },
  render: (a) =>
    html`<t-empty-state heading=${a.heading}
      >${a.description}<t-button slot="actions">Create record</t-button></t-empty-state
    >`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {};
export const CustomIcon: Story = {
  render: () =>
    html`<t-empty-state heading="No matches"
      ><t-icon name="search" slot="icon" size="36"></t-icon>Change your filters to search
      again.</t-empty-state
    >`,
};
