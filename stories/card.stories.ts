import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
const meta = {
  title: 'Components/Card',
  component: 't-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Content panel. Slots: `heading`, default body, `footer`. Empty heading/footer slots collapse. CSS parts: `heading`, `body`, `footer`. Use semantic headings inside the heading slot when the panel starts a page section.',
      },
    },
  },
  render: () =>
    html`<t-card
      ><h2 slot="heading" style="font:inherit;margin:0">Workspace</h2>
      <p>Your workspace is ready.</p>
      <span slot="footer">Last updated just now</span></t-card
    >`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {};
export const BodyOnly: Story = {
  render: () => html`<t-card>A panel without a heading or footer.</t-card>`,
};
