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
];
const meta = {
  title: 'Data/Table',
  component: 't-table',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Accessible native table with local sorting, plain-text cells, and optional checkbox selection. Supply `columns` and `rows` as JavaScript properties. Set `row-key` to a globally unique string/number field. Source indexes are a fallback for static rows only. `t-sort` emits `{ key, direction }`; `t-selection-change` emits `{ selectedKeys }`. Selection uses stable identifiers across sorting. Replace arrays after data changes. This is a table, with no editable cells, virtualization, or server-side sorting. Use separate pagination for large datasets.',
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
