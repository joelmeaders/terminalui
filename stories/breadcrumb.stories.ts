import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/breadcrumb';
const meta = {
  title: 'Navigation/Breadcrumb',
  component: 't-breadcrumb',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Native navigation links. Set `items` to `{ label, href?, current? }[]`. The last item is current unless another item sets `current`. Set `label` when multiple breadcrumb landmarks appear on a page. Links accept ordinary web navigation URLs. Data labels render as text.',
      },
    },
  },
  render: () =>
    html`<t-breadcrumb
      .items=${[{ label: 'Home', href: '#home' }, { label: 'Projects', href: '#projects' }, { label: 'Terminal Kit' }]}
    ></t-breadcrumb>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {};
export const LongPath: Story = {
  render: () =>
    html`<div style="max-width:360px">
      <t-breadcrumb
        .items=${[{ label: 'Organization', href: '#organization' }, { label: 'Engineering', href: '#engineering' }, { label: 'Design systems', href: '#systems' }, { label: 'Component library documentation' }]}
      ></t-breadcrumb>
    </div>`,
};
