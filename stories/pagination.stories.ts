import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/pagination';
const meta = {
  title: 'Navigation/Pagination',
  component: 't-pagination',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Set `total` to the item count and `page-size` to the page length. `page` is one-based and clamps to valid bounds. Navigation emits `t-change` with `{ page, pageSize }`. The component does not fetch data. Only the first, last, and nearby pages render, including for very large totals. Zero items display page 1 of 1.',
      },
    },
  },
  render: () => html`<t-pagination total="125" page-size="10"></t-pagination>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const pagination = canvasElement.querySelector('t-pagination')!;
    await userEvent.click(pagination.shadowRoot!.querySelector('[aria-label="Next page"]')!);
    await expect(pagination.page).toBe(2);
    await expect(pagination.shadowRoot!.querySelector('[aria-current="page"]')).toHaveTextContent(
      '2',
    );
  },
};
export const LastPage: Story = {
  render: () => html`<t-pagination total="125" page="13"></t-pagination>`,
};
export const Empty: Story = { render: () => html`<t-pagination total="0"></t-pagination>` };
export const Disabled: Story = {
  render: () => html`<t-pagination total="125" disabled></t-pagination>`,
};
export const KeyboardPages: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Numbered actions keep focus on the chosen page when nearby page buttons change. Use Tab, Enter, and Space as for native buttons.',
      },
    },
  },
  render: () => html`<t-pagination label="Archive pages" total="100" page="3"></t-pagination>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-pagination')!;
    const button = host.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Page 4"]')!;
    button.focus();
    await userEvent.keyboard('{Enter}');
    await host.updateComplete;
    await expect(host.page).toBe(4);
    await expect(host.shadowRoot!.activeElement).toBe(button);
    await expect(button).toHaveAttribute('aria-current', 'page');
    // Native Tab order through shadow roots is checked in Playwright.
    await userEvent.keyboard(' ');
    await host.updateComplete;
    await expect(host.page).toBe(4);
    await expect(host.shadowRoot!.activeElement).toBe(button);
  },
};
export const BoundaryFocus: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Next becomes disabled at the final page. Keyboard focus recovers to the current page instead of remaining on an unavailable action.',
      },
    },
  },
  render: () => html`<t-pagination label="Archive pages" total="100" page="9"></t-pagination>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-pagination')!;
    const next = host.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!;
    next.focus();
    await userEvent.keyboard('{Enter}');
    await host.updateComplete;
    await expect(next).toBeDisabled();
    await expect(host.shadowRoot!.activeElement).toHaveAttribute('aria-label', 'Page 10');
  },
};
export const LiveResults: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Changing total clamps page without a user-change event. A removed focused page recovers to the current page. Disabling all actions uses the named navigation region.',
      },
    },
  },
  render: () => html`<t-pagination label="Archive pages" total="100" page="8"></t-pagination>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-pagination')!;
    host.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Page 8"]')!.focus();
    host.total = 20;
    await host.updateComplete;
    await expect(host.page).toBe(2);
    await expect(host.shadowRoot!.activeElement).toHaveAttribute('aria-label', 'Page 2');
    host.disabled = true;
    await host.updateComplete;
    await expect(host.shadowRoot!.activeElement).toBe(host.shadowRoot!.querySelector('nav'));
    await expect(host.shadowRoot!.activeElement).toHaveAttribute('aria-label', 'Archive pages');
    host.disabled = false;
    await host.updateComplete;
    await expect(host.shadowRoot!.activeElement).toHaveAttribute('aria-label', 'Page 2');
  },
};
