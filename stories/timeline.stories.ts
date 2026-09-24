import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/timeline';
const meta = {
  title: 'Data/Timeline',
  component: 't-timeline',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Semantic ordered history. `items` contain a unique `id`, `title`, optional `description`, readable `date`, machine-readable `dateTime`, and plain-text `status`. The application owns ordering and date formatting. Timeline entries do not imply interactive navigation.',
      },
    },
  },
  render: () =>
    html`<t-timeline
      .items=${[
        {
          id: 'created',
          title: 'Request created',
          date: 'September 23, 2026',
          dateTime: '2026-09-23',
          description: 'The request is ready for review.',
          status: 'Complete',
        },
        {
          id: 'review',
          title: 'Review started',
          date: 'September 24, 2026',
          dateTime: '2026-09-24',
          status: 'In progress',
        },
        { id: 'approval', title: 'Approval required', status: 'Pending' },
      ]}
    ></t-timeline>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {};
export const Empty: Story = {
  render: () => html`<t-timeline empty-text="No activity has been recorded."></t-timeline>`,
};
