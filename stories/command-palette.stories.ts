import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/command-palette';
const commands = [
  { value: 'open', label: 'Open project', description: 'Choose a workspace', keywords: ['folder'] },
  { value: 'save', label: 'Save changes', disabled: true },
  { value: 'settings', label: 'Workspace settings', description: 'Change local preferences' },
];
const meta = {
  title: 'Navigation/Command palette',
  component: 't-command-palette',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Searchable native modal with a combobox and listbox. Set `commands` to objects with unique `value`, `label`, optional `description`, `keywords`, and `disabled`. Call `show(opener?)` / `close()` or set `open`. `show()` clears the query. Arrow keys, Home/End, Enter, Escape, and modal Tab containment work without a global keyboard shortcut. `t-select` emits `{ value, command }`; the application runs the action. `t-close` fires after focus returns. The list is local and not virtualized.',
      },
    },
  },
  render: () =>
    html`<button
        @click=${(event: Event) => {
          const trigger = event.currentTarget as HTMLElement;
          (
            trigger.nextElementSibling as import('../src/components/command-palette').TCommandPalette
          ).show(trigger);
        }}
      >
        Find a command</button
      ><t-command-palette .commands=${commands}></t-command-palette>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector('button')!;
    await userEvent.click(trigger);
    const palette = canvasElement.querySelector('t-command-palette')!;
    const input = palette.shadowRoot!.querySelector('input')!;
    await userEvent.type(input, 'settings');
    await expect(palette.shadowRoot!.querySelectorAll('[role=option]').length).toBe(1);
    await userEvent.keyboard('{Escape}');
    await expect(palette.open).toBe(false);
  },
};
export const Loading: Story = {
  render: () =>
    html`<button
        @click=${(event: Event) => (event.currentTarget as HTMLElement).nextElementSibling && ((event.currentTarget as HTMLElement).nextElementSibling as import('../src/components/command-palette').TCommandPalette).show(event.currentTarget as HTMLElement)}
      >
        Open loading palette</button
      ><t-command-palette loading></t-command-palette>`,
};
export const Empty: Story = {
  render: () =>
    html`<button
        @click=${(event: Event) => ((event.currentTarget as HTMLElement).nextElementSibling as import('../src/components/command-palette').TCommandPalette).show(event.currentTarget as HTMLElement)}
      >
        Open empty palette</button
      ><t-command-palette></t-command-palette>`,
};
