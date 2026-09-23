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
