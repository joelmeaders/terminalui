import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/tree';
import type { TreeItem } from '../src/components/tree';
const items = [
  {
    id: 'src',
    label: 'Source',
    children: [
      { id: 'components', label: 'Components', children: [{ id: 'button', label: 'button.ts' }] },
      { id: 'private', label: 'Private', disabled: true },
      { id: 'index', label: 'index.ts' },
    ],
  },
  { id: 'readme', label: 'README.md' },
];
const meta = {
  title: 'Navigation/Tree',
  component: 't-tree',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Single-select hierarchy. Set `items` to `{ id, label, disabled?, children? }[]` with globally unique IDs. `expandedIds` and `value` are properties. Replace arrays to update them. Arrow keys navigate and expand/collapse, Home/End move to endpoints, typeahead finds labels, and Enter/Space selects. Asterisk expands siblings. Disabled rows are skipped. `t-select` emits `{ value, item }`; `t-toggle` emits `{ id, expanded, expandedIds }`. Selection does not follow focus. This component does not load remote children, virtualize, or provide drag-and-drop.',
      },
    },
  },
  render: () =>
    html`<t-tree label="Project files" .items=${items} .expandedIds=${['src']}></t-tree>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector('t-tree')!;
    await tree.updateComplete;
    await expect(tree.shadowRoot!.activeElement).toBeNull();
    await userEvent.click(tree.shadowRoot!.querySelector('[data-id="src"]')!);
    await userEvent.keyboard('{End}{Enter}');
    await expect(tree.value).toBe('readme');
    await expect(tree.shadowRoot!.querySelectorAll('[role="treeitem"][tabindex="0"]').length).toBe(
      1,
    );
  },
};
export const Collapsed: Story = {
  render: () => html`<t-tree label="Project files" .items=${items}></t-tree>`,
};
export const Selected: Story = {
  render: () =>
    html`<t-tree
      label="Project files"
      .items=${items}
      .expandedIds=${['src', 'components']}
      value="button"
    ></t-tree>`,
};
export const Empty: Story = {
  render: () =>
    html`<p>No project files are available.</p>
      <t-tree label="Project files"></t-tree>`,
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector('t-tree')!;
    await tree.updateComplete;
    const group = tree.shadowRoot!.querySelector<HTMLElement>('[part=tree]')!;
    await expect(group).toHaveAttribute('role', 'group');
    group.focus();
    tree.items = items;
    await tree.updateComplete;
    await expect(group).toHaveAttribute('role', 'tree');
    await expect(tree.shadowRoot!.activeElement?.getAttribute('data-id')).toBe('src');
  },
};
export const Unavailable: Story = {
  render: () =>
    html`<t-tree
      label="Unavailable files"
      .items=${[
        { id: 'first', label: 'First file', disabled: true },
        { id: 'second', label: 'Second file', disabled: true },
      ]}
    ></t-tree>`,
};
export const LiveBranchCollapse: Story = {
  render: () =>
    html`<p>An application can collapse a branch while one of its descendants has focus.</p>
      <t-tree
        label="Project files"
        .items=${items}
        .expandedIds=${['src', 'components']}
        value="button"
      ></t-tree>`,
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector('t-tree')!;
    tree.shadowRoot!.querySelector<HTMLElement>('[data-id="button"]')!.focus();
    tree.expandedIds = ['src'];
    await tree.updateComplete;
    await expect(tree.shadowRoot!.activeElement?.getAttribute('data-id')).toBe('components');
    await expect(tree.value).toBe('button');
    await expect(tree.shadowRoot!.querySelector('[data-id="src"] > [role="group"]')).not.toBeNull();
  },
};

const archiveFolders = [
  'Archive',
  'Operations',
  'Sector 17',
  'Atmosphere',
  'Telemetry',
  'Sensor packages',
  'Laboratory',
  'Validated samples',
];
let archiveItems: TreeItem[] = [
  {
    id: 'sample',
    label: 'environmental_readings_2026_09_26_sector17_revision3.json',
  },
];
for (let index = archiveFolders.length - 1; index >= 0; index--)
  archiveItems = [{ id: `folder-${index}`, label: archiveFolders[index], children: archiveItems }];
export const LongLabels: Story = {
  render: () =>
    html`<section style="max-width:320px;--t-tree-indent:16px">
      <p>Use the arrow keys to browse. Long filenames wrap within this narrow archive.</p>
      <t-tree
        label="Sample archive"
        .items=${archiveItems}
        .expandedIds=${archiveFolders.map((_, index) => `folder-${index}`)}
      ></t-tree>
    </section>`,
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector('t-tree')!;
    await tree.updateComplete;
    tree.shadowRoot!.querySelector<HTMLElement>('[data-id=folder-0]')!.focus();
    await userEvent.keyboard('{End}{Enter}');
    await expect(tree.value).toBe('sample');
    await expect(tree.shadowRoot!.activeElement?.getAttribute('data-id')).toBe('sample');
    await expect(tree.scrollWidth).toBeLessThanOrEqual(tree.clientWidth + 1);
    const indentation = [...tree.shadowRoot!.querySelectorAll('[part=row]')].map((row) =>
      Number.parseFloat(getComputedStyle(row).paddingInlineStart),
    );
    for (let index = 1; index < indentation.length; index++)
      await expect(indentation[index]).toBeGreaterThan(indentation[index - 1]);
  },
};
