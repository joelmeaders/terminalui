import '../src/components/icon';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/link';
const meta = {
  title: 'Navigation/Link',
  component: 't-link',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Native inline anchor. Supports relative URLs, HTTP(S), mailto, and tel. Unsupported schemes render an unavailable link. `external` opens a new tab with `noopener noreferrer` and a visible/accessible notice; `target="_blank"` receives the same protection. Set `label` for icon-only content. Disabled links are removed from the tab order. Inline links use the WCAG inline-target exception; standalone navigation should provide surrounding target space.',
      },
    },
  },
  render: () =>
    html`<p>Continue to the <t-link href="#workspace">workspace configuration guide</t-link>.</p>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {};
export const External: Story = {
  render: () =>
    html`<p><t-link href="https://example.com" external>Example documentation</t-link></p>`,
};
export const Disabled: Story = {
  render: () => html`<p><t-link href="#unavailable" disabled>Unavailable document</t-link></p>`,
};

export const WithSlots: Story = {
  render: () =>
    html`<t-link href="#archive"
      ><t-icon slot="start" name="folder"></t-icon>Archive<t-icon
        slot="end"
        name="chevron-right"
      ></t-icon
    ></t-link>`,
};
