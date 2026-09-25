import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/table';
const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role' },
  { key: 'projects', label: 'Projects', sortable: true },
];
const rows = [
  { id: 'ada', name: 'Ada', role: 'Engineer', projects: 12 },
  { id: 'grace', name: 'Grace', role: 'Architect', projects: 4 },
  { id: 'alan', name: 'Alan', role: 'Researcher', projects: 8 },
  { id: 'mira', name: 'Mira', role: 'Engineer', projects: 6 },
  { id: 'jo', name: 'Jo', role: 'Designer', projects: 10 },
];
const meta = {
  title: 'Data/Table',
  component: 't-table',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Accessible native table with local filtering, sorting, paging, plain-text cells, and optional checkbox selection. Supply `columns` and `rows` as JavaScript properties. Set `row-key` to a globally unique string/number field. Source indexes are a fallback for static rows only. `t-filter` emits `{ query }`; `t-sort` emits `{ key, direction }`; `t-page-change` emits `{ page, pageSize }`; `t-selection-change` emits `{ selectedKeys }`. Selection uses stable identifiers across filtering, sorting, and pages. Replace arrays after data changes. This table does not fetch data, virtualize rows, or edit cells.',
      },
    },
  },
  render: () =>
    html`<t-table caption="Team directory" .columns=${columns} .rows=${rows}></t-table>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const table = canvasElement.querySelector('t-table')!;
    await userEvent.click(table.shadowRoot!.querySelector('[aria-label="Sort by Projects"]')!);
    await expect(table.shadowRoot!.querySelector('tbody tr')).toHaveTextContent('Grace');
    await expect(table.shadowRoot!.querySelector('[aria-sort="ascending"]')).toHaveTextContent(
      'Projects',
    );
  },
};
export const Selectable: Story = {
  render: () =>
    html`<t-table
      caption="Select team members"
      selectable
      .columns=${columns}
      .rows=${rows}
      .selectedKeys=${['ada']}
    ></t-table>`,
};
export const Empty: Story = {
  render: () =>
    html`<t-table
      caption="Search results"
      .columns=${columns}
      empty-text="No matching team members."
    ></t-table>`,
};
export const Loading: Story = {
  render: () => html`<t-table caption="Team directory" .columns=${columns} loading></t-table>`,
};
export const FilterAndPage: Story = {
  render: () =>
    html`<t-table
      caption="Team directory"
      filterable
      selectable
      page-size="2"
      .columns=${columns}
      .rows=${rows}
    ></t-table>`,
  play: async ({ canvasElement }) => {
    const table = canvasElement.querySelector('t-table')!;
    await userEvent.click(
      table.shadowRoot!.querySelector('[aria-label="Next page for Team directory"]')!,
    );
    await expect(table.shadowRoot!.querySelector('tbody')).toHaveTextContent('Alan');
    await userEvent.type(table.shadowRoot!.querySelector('input[type="search"]')!, 'engineer');
    await expect(table.shadowRoot!.querySelector('.count')).toHaveTextContent('2 of 5 records');
    await expect(table.page).toBe(1);
  },
};
export const NoMatches: Story = {
  render: () =>
    html`<t-table
      caption="Team directory"
      filterable
      query="missing"
      .columns=${columns}
      .rows=${rows}
    ></t-table>`,
};
