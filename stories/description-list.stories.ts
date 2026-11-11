import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/description-list';
const meta = {
  title: 'Data/Description list',
  component: 't-description-list',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Native description list for term/value pairs. Set `items` to `{ term, value }[]`. Values render as plain text. Pairs use two columns and stack below a 400px container width. The default slot accepts additional native `dt` / `dd` pairs, optionally grouped in a `div`, for rich content.',
      },
    },
  },
  render: () =>
    html`<t-description-list
      .items=${[
        { term: 'Workspace', value: 'Mission archive' },
        { term: 'Owner', value: 'Ellen Ripley' },
        { term: 'Documents', value: 42 },
      ]}
    ></t-description-list>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {};
export const RichContent: Story = {
  render: () =>
    html`<t-description-list .items=${[{ term: 'Status', value: 'Ready' }]}
      ><dt>Documentation</dt>
      <dd><a href="#guide">Read the setup guide</a></dd></t-description-list
    >`,
};
export const Narrow: Story = {
  render: () =>
    html`<div style="max-width:280px">
      <t-description-list
        .items=${[
          { term: 'Workspace identifier', value: 'mission-archive-navigation-records-2026' },
          { term: 'Notes', value: 'Additional information remains readable at narrow widths.' },
        ]}
      ></t-description-list>
    </div>`,
};
