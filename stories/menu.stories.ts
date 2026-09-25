import '../src/components/icon';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/menu';

const options = [
  { value: 'open', label: 'Open' },
  { value: 'rename', label: 'Rename', disabled: true },
  { value: 'divider', label: '', separator: true },
  { value: 'save', label: 'Save a copy' },
];
const meta = {
  title: 'Navigation/Menu',
  component: 't-menu',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Single-level action menu. Set the `options` property to `{ value, label, disabled?, separator? }[]`. Replace the array to update an open menu. Focus follows a surviving action value, or moves to an available action if its value disappears. Arrow keys, Home/End, typeahead, Escape, Tab, and outside interaction work with a native trigger. `t-select` emits `{ value, option }`. Disabled actions are skipped. The menu uses a native top-layer popover and adjusts its position at viewport edges. Nested menus and checkbox actions are outside its scope.',
      },
    },
  },
  render: () =>
    html`<div style="min-height:200px">
      <t-menu label="File actions" .options=${options}></t-menu>
    </div>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector('t-menu')!;
    const trigger = menu.shadowRoot!.querySelector('button')!;
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowDown}');
    await expect(menu.shadowRoot!.activeElement?.textContent).toBe('Save a copy');
    await userEvent.keyboard('{Escape}');
    await expect(menu.shadowRoot!.activeElement).toBe(trigger);
  },
};
export const Disabled: Story = {
  render: () => html`<t-menu label="Unavailable actions" disabled .options=${options}></t-menu>`,
};
export const LiveOptions: Story = {
  render: () =>
    html`<div style="min-height:200px">
      <t-menu label="Live actions" .options=${options}></t-menu>
    </div>`,
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector('t-menu')!;
    await userEvent.click(menu.shadowRoot!.querySelector('.trigger')!);
    await userEvent.keyboard('{End}');
    await expect(menu.shadowRoot!.activeElement?.textContent).toBe('Save a copy');
    menu.options = [
      { value: 'save', label: 'Save a copy' },
      { value: 'open', label: 'Open' },
    ];
    await menu.updateComplete;
    await expect(menu.shadowRoot!.activeElement?.textContent).toBe('Save a copy');
    menu.options = [{ value: 'open', label: 'Open' }];
    await menu.updateComplete;
    await expect(menu.shadowRoot!.activeElement?.textContent).toBe('Open');
  },
};
export const Empty: Story = {
  render: () => html`<t-menu label="No available actions" disabled></t-menu>`,
};

export const WithSlots: Story = {
  render: () =>
    html`<t-menu
      label="Record actions"
      .options=${[
        { value: 'download', label: 'Download' },
        { value: 'archive', label: 'Archive' },
      ]}
      ><t-icon slot="start" name="more"></t-icon
    ></t-menu>`,
};
