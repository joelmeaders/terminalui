import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/toolbar';
import '../src/components/button';
const meta = {
  title: 'Navigation/Toolbar',
  component: 't-toolbar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Roving toolbar for native buttons/links and action controls with open shadow roots, including `t-button` and `t-icon-button`. Tab enters one action; arrow keys and Home/End move through enabled actions. Horizontal arrows follow text direction. Disabled actions are skipped. Existing tabindex values return when controls leave the toolbar. Text inputs, selects, and nested composite widgets must remain outside this toolbar.',
      },
    },
  },
  render: () =>
    html`<t-toolbar label="Document actions"
      ><t-button>New document</t-button><t-button disabled>Delete document</t-button
      ><t-button variant="secondary">Download document</t-button></t-toolbar
    >`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const buttons = canvasElement.querySelectorAll('t-button');
    await userEvent.click(buttons[0].shadowRoot!.querySelector('button')!);
    await userEvent.keyboard('{ArrowRight}');
    await expect(buttons[2].shadowRoot!.activeElement).toBe(
      buttons[2].shadowRoot!.querySelector('button'),
    );
  },
};
export const Vertical: Story = {
  render: () =>
    html`<t-toolbar label="Edit actions" orientation="vertical"
      ><button>Cut selection</button><button>Copy selection</button
      ><button>Paste selection</button></t-toolbar
    >`,
};
export const Empty: Story = {
  render: () => html`<t-toolbar label="No available document actions"></t-toolbar>`,
};
