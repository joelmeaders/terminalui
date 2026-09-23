import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
const meta = {
  title: 'Components/Dialog',
  component: 't-dialog',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Native modal dialog. Call `show(opener?)` / `close()` or set `open`. Pass the opening button to `show` for consistent focus return after pointer activation. `heading` provides its accessible name. Supports Escape and native modal focus behavior. Slots: body and `footer`. Emits `t-close`. CSS part: `dialog`.',
      },
    },
  },
  render: () =>
    html`<t-button
        @click=${(e: Event) => {
          const trigger = e.currentTarget as HTMLElement;
          (trigger.nextElementSibling as import('../src').TDialog).show(trigger);
        }}
        >Open dialog</t-button
      ><t-dialog heading="Confirm action"
        ><p>This is a demonstration dialog.</p>
        <t-button
          slot="footer"
          @click=${(e: Event) => {
            (e.currentTarget as HTMLElement).closest('t-dialog')!.close();
          }}
          >Confirm</t-button
        ></t-dialog
      >`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector('t-button')!.shadowRoot!.querySelector('button')!;
    await userEvent.click(trigger);
    const dialog = canvasElement.querySelector('t-dialog')!.shadowRoot!.querySelector('dialog')!;
    await expect(dialog.open).toBe(true);
    await userEvent.click(dialog.querySelector('button')!);
    await expect(dialog.open).toBe(false);
  },
};
