import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/toast';
import { expect, userEvent } from 'storybook/test';
import type { TToast } from '../src/components/toast';
const meta = {
  title: 'Components/Toast',
  component: 't-toast',
  tags: ['autodocs'],
  args: {
    message: 'Your configuration was saved.',
    variant: 'success',
    urgent: false,
    duration: 0,
  },
  argTypes: { variant: { control: 'select', options: ['info', 'success', 'warning', 'danger'] } },
  render: (a) =>
    html`<t-toast
      open
      message=${a.message}
      variant=${a.variant}
      ?urgent=${a.urgent}
      .duration=${a.duration}
    ></t-toast>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Persistent: Story = {
  play: async ({ canvasElement }) => {
    const toast = canvasElement.querySelector('t-toast') as TToast;
    await userEvent.click(toast.shadowRoot!.querySelector('button')!);
    await expect(toast.open).toBe(false);
  },
};
export const Warning: Story = {
  args: { variant: 'warning', message: 'Connection lost. Your changes are stored locally.' },
};
export const Urgent: Story = {
  args: { variant: 'danger', urgent: true, message: 'Your session has ended. Sign in again.' },
};
export const Triggered: Story = {
  render: () =>
    html`<t-stack
      ><t-button
        @click=${(e: Event) => {
          (e.currentTarget as HTMLElement)
            .parentElement!.querySelector<TToast>('t-toast')!
            .show('Configuration saved.', e.currentTarget as HTMLElement);
        }}
        >Save configuration</t-button
      ><t-toast variant="success"></t-toast
    ></t-stack>`,
};
