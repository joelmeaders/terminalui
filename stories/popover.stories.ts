import '../src/components/icon';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/popover';
import { expect, userEvent, waitFor } from 'storybook/test';
const meta = {
  title: 'Components/Popover',
  component: 't-popover',
  tags: ['autodocs'],
  args: {
    label: 'Display options',
    heading: 'Display options',
    placement: 'bottom',
    disabled: false,
  },
  argTypes: { placement: { control: 'select', options: ['top', 'bottom', 'left', 'right'] } },
  render: (a) =>
    html`<t-popover
      label=${a.label}
      heading=${a.heading}
      placement=${a.placement}
      ?disabled=${a.disabled}
      ><t-stack
        ><t-checkbox label="Show labels" checked></t-checkbox
        ><t-select
          label="Sort order"
          .options=${[
            { value: 'new', label: 'Newest first' },
            { value: 'old', label: 'Oldest first' },
          ]}
        ></t-select></t-stack
    ></t-popover>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('t-popover')!.shadowRoot!;
    await userEvent.click(root.querySelector('button')!);
    await waitFor(() => expect(root.querySelector('[role=dialog]')).toBeVisible());
    await userEvent.keyboard('{Escape}');
  },
};
export const Disabled: Story = { args: { disabled: true } };
export const EdgePlacement: Story = { args: { placement: 'left' } };

export const WithSlots: Story = {
  render: () =>
    html`<t-popover label="Settings" heading="Workspace settings"
      ><t-icon slot="start" name="settings"></t-icon>Your settings are stored in this
      workspace.</t-popover
    >`,
};
