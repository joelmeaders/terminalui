import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/drawer';
const renderDrawer = (placement: 'start' | 'end') =>
  html`<button
      @click=${(event: Event) => {
        const opener = event.currentTarget as HTMLElement;
        (opener.nextElementSibling as import('../src/components/drawer').TDrawer).show(opener);
      }}
    >
      Open details</button
    ><t-drawer heading="Project details" placement=${placement}
      ><p>A modal side panel for settings, details, and task forms.</p>
      <label>Project name <input value="Hullframe" /></label
      ><button
        slot="footer"
        @click=${(event: Event) => (event.currentTarget as HTMLElement).closest('t-drawer')!.close()}
      >
        Done
      </button></t-drawer
    >`;
const meta = {
  title: 'Overlays/Drawer',
  component: 't-drawer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Native modal side panel. Call `show(opener?)` or set `open`; call `close()` to dismiss. Pass the native trigger to preserve focus return. `heading` names the panel. `placement` is `start` or `end` and follows document direction. The browser traps focus and Escape dismisses the panel. While open, background scrolling is locked and long modal content remains scrollable. Closing restores page scrolling. Body and `footer` slots accept normal content. Emits `t-close`. Backdrop clicks do not close the drawer.',
      },
    },
  },
  render: () => renderDrawer('end'),
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector('button')!;
    await userEvent.click(trigger);
    const drawer = canvasElement.querySelector('t-drawer')!;
    await expect(drawer.shadowRoot!.querySelector('dialog')!.open).toBe(true);
    await userEvent.click(drawer.shadowRoot!.querySelector('button')!);
    await expect(drawer.shadowRoot!.querySelector('dialog')!.open).toBe(false);
  },
};
export const Start: Story = { render: () => renderDrawer('start') };
