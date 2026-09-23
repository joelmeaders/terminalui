import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
const meta = {
  title: 'Components/Tooltip',
  component: 't-tooltip',
  tags: ['autodocs'],
  args: { label: 'About logging', message: 'Diagnostics stay in your application.' },
  parameters: {
    docs: {
      description: {
        component:
          'Help tooltip with a built-in named button. Opens on hover, focus, or click. Escape dismisses it. Supply `label` for the button and `message` for the explanation. Keep tooltip content noninteractive. CSS parts: `trigger`, `tooltip`.',
      },
    },
  },
  render: (a) =>
    html`<div style="padding-top:70px">
      <t-tooltip label=${a.label} message=${a.message}></t-tooltip>
    </div>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-tooltip')!;
    await userEvent.click(host.shadowRoot!.querySelector('button')!);
    await expect(host.shadowRoot!.querySelector('[role=tooltip]')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect(host.shadowRoot!.querySelector('[role=tooltip]')).not.toBeVisible();
  },
};
