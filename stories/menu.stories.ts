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
  render: () =>
    html`<t-menu label="File actions" empty-message="No file actions are available."></t-menu>`,
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector('t-menu')!;
    const trigger = menu.shadowRoot!.querySelector<HTMLButtonElement>('.trigger')!;
    await userEvent.click(trigger);
    await expect(trigger).not.toHaveAttribute('aria-haspopup');
    await expect(menu.shadowRoot!.activeElement).toBe(
      menu.shadowRoot!.querySelector('[role=group]'),
    );
    await expect(menu.shadowRoot!.querySelector('[role=status]')).toHaveTextContent(
      'No file actions are available.',
    );
    menu.options = [{ value: 'open', label: 'Open' }];
    await menu.updateComplete;
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await expect(menu.shadowRoot!.activeElement?.textContent).toBe('Open');
    await userEvent.keyboard('{Escape}');
    await expect(menu.shadowRoot!.activeElement).toBe(trigger);
  },
};
export const SeparatorsOnly: Story = {
  render: () =>
    html`<t-menu
      label="File actions"
      .options=${[{ value: 'line', label: '', separator: true }]}
    ></t-menu>`,
};
export const UnavailableActions: Story = {
  render: () =>
    html`<t-menu
      label="File actions"
      .options=${[{ value: 'open', label: 'Open', disabled: true }]}
    ></t-menu>`,
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

const archiveActions = [
  {
    value: 'download',
    label: 'Download environmental_readings_2026_09_26_sector17_revision3.json',
  },
  {
    value: 'delete',
    label: 'Delete environmental_readings_2026_09_26_sector17_revision3.json',
    disabled: true,
  },
  {
    value: 'copy',
    label: 'Copy atmospheric_sensor_calibration_2026_09_26_laboratory_analysis.json',
  },
  {
    value: 'archive',
    label: 'Archive atmospheric_sensor_calibration_2026_09_26_laboratory_analysis.json',
  },
];
export const LongLabels: Story = {
  render: () =>
    html`<section style="max-width:320px;min-height:360px">
      <p>Use the arrow keys to browse the available actions. Filenames wrap within the menu.</p>
      <t-menu
        label="Actions for environmental_readings_2026_09_26_sector17_revision3.json"
        .options=${archiveActions}
      ></t-menu>
    </section>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-menu')!;
    await userEvent.click(host.shadowRoot!.querySelector('.trigger')!);
    await userEvent.keyboard('{End}');
    const item = host.shadowRoot!.activeElement as HTMLElement;
    await expect(item.dataset.value).toBe('archive');
    await expect(item).toHaveAttribute('tabindex', '0');
    const panel = host.shadowRoot!.querySelector<HTMLElement>('[part=menu]')!;
    await expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth + 1);
    await expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1);
  },
};
