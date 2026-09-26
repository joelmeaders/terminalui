import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import '../src/components/toolbar';
import '../src/components/button';

// Demonstrate a consumer's projected action group without adding a library component.
if (!customElements.get('demo-toolbar-actions'))
  customElements.define(
    'demo-toolbar-actions',
    class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: 'open' }).innerHTML = '<slot name="actions"></slot>';
      }
    },
  );
const meta = {
  title: 'Navigation/Toolbar',
  component: 't-toolbar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Roving toolbar for native buttons/links and action controls with open shadow roots, including `t-button` and `t-icon-button`. Actions can use nested slots and wrappers. Tab enters one action; arrow keys and Home/End follow rendered order. Horizontal arrows follow text direction. Disabled, hidden, inert, and collapsed actions are skipped. When a focused action becomes unavailable, focus moves to an available action or the empty toolbar. Changes preserve outside focus. Existing tabindex values return when controls leave the toolbar. Text inputs, selects, and nested composite widgets must remain outside this toolbar.',
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
export const LiveActions: Story = {
  render: () =>
    html`<t-toolbar label="Live actions"
      ><button>One</button><button>Two</button><button>Three</button></t-toolbar
    >`,
  play: async ({ canvasElement }) => {
    const [first, second, third] =
      canvasElement.querySelectorAll<HTMLButtonElement>('t-toolbar button');
    second.focus();
    second.remove();
    await waitFor(() => expect(document.activeElement).toBe(third));
    third.disabled = true;
    await waitFor(() => expect(document.activeElement).toBe(first));
  },
};
export const Empty: Story = {
  render: () => html`<t-toolbar label="No available document actions"></t-toolbar>`,
};
export const ProjectedActions: Story = {
  render: () =>
    html`<t-toolbar label="Projected archive actions">
      <t-button>Refresh</t-button>
      <demo-toolbar-actions
        ><t-button slot="actions">Export</t-button
        ><t-button slot="actions">Help</t-button></demo-toolbar-actions
      >
      <span inert><t-button>Unavailable action</t-button></span>
    </t-toolbar>`,
  play: async ({ canvasElement }) => {
    const buttons = canvasElement.querySelectorAll('t-button');
    await userEvent.click(buttons[0].shadowRoot!.querySelector('button')!);
    await userEvent.keyboard('{ArrowRight}');
    await expect(buttons[1].shadowRoot!.activeElement).toBe(
      buttons[1].shadowRoot!.querySelector('button'),
    );
    await userEvent.keyboard('{End}');
    await expect(buttons[2].shadowRoot!.activeElement).toBe(
      buttons[2].shadowRoot!.querySelector('button'),
    );
    const group = canvasElement.querySelector<HTMLElement>('demo-toolbar-actions')!;
    group.inert = true;
    await waitFor(() =>
      expect(buttons[0].shadowRoot!.activeElement).toBe(
        buttons[0].shadowRoot!.querySelector('button'),
      ),
    );
    group.inert = false;
    await userEvent.keyboard('{ArrowRight}');
    await expect(buttons[1].shadowRoot!.activeElement).toBe(
      buttons[1].shadowRoot!.querySelector('button'),
    );
  },
};
