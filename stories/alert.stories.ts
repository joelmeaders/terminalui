import '../src/components/icon';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
const meta = {
  title: 'Components/Alert',
  component: 't-alert',
  tags: ['autodocs'],
  args: { variant: 'info', dismissible: false, urgent: false, message: 'The system is ready.' },
  argTypes: { variant: { control: 'select', options: ['info', 'success', 'warning', 'danger'] } },
  parameters: {
    docs: {
      description: {
        component:
          'Inline notice with `role=status`. Set `urgent` for `role=alert` only when an immediate announcement is needed. `dismissible` adds a close control and emits `t-dismiss`. CSS part: `notice`. Dismissal applies to this instance until it is replaced.',
      },
    },
  },
  render: (a) =>
    html`<t-alert variant=${a.variant} ?dismissible=${a.dismissible} ?urgent=${a.urgent}
      >${a.message}</t-alert
    >`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Information: Story = {};
export const Success: Story = { args: { variant: 'success', message: 'Configuration saved.' } };
export const Warning: Story = {
  args: { variant: 'warning', message: 'Storage is approaching its limit.' },
};
export const Error: Story = {
  args: { variant: 'danger', message: 'Connection failed. Try again.' },
};
export const Dismissible: Story = {
  args: { dismissible: true },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-alert')!;
    await userEvent.click(host.shadowRoot!.querySelector('button')!);
    await expect(host.shadowRoot!.querySelector('[role=status]')).toBeNull();
  },
};

export const WithSlots: Story = {
  render: () =>
    html`<t-alert variant="success" dismissible
      ><t-icon slot="icon" name="check"></t-icon>Your configuration was saved.</t-alert
    >`,
};
