import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
const meta = {
  title: 'Components/Tabs',
  component: 't-tabs',
  tags: ['autodocs'],
  args: { active: 'overview', orientation: 'horizontal', dir: 'ltr' },
  parameters: {
    docs: {
      description: {
        component:
          'Set `tabs` to `{id, label, disabled?}[]`. Supply a named slot for each ID. `active` selects a tab. Horizontal tabs use Left/Right, reversed in RTL. Set `orientation="vertical"` for Up/Down. Home/End select the first/last enabled tab. Emits `t-change` with `detail.value`. CSS parts: `tab`, `panel`.',
      },
    },
  },
  render: (a) =>
    html`<t-tabs
      label="Workspace sections"
      active=${a.active}
      orientation=${a.orientation}
      dir=${a.dir}
      .tabs=${[
        { id: 'overview', label: 'Overview' },
        { id: 'locked', label: 'Locked', disabled: true },
        { id: 'settings', label: 'Settings' },
      ]}
      ><p slot="overview">Workspace overview.</p>
      <p slot="locked">Unavailable.</p>
      <p slot="settings">Workspace settings.</p></t-tabs
    >`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-tabs')!;
    const tabs = host.shadowRoot!.querySelectorAll<HTMLButtonElement>('[role=tab]');
    tabs[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    await expect(host.shadowRoot!.activeElement).toBe(tabs[2]);
  },
};
export const SecondTab: Story = { args: { active: 'settings' } };
export const Vertical: Story = {
  args: { orientation: 'vertical' },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-tabs')!;
    const tabs = host.shadowRoot!.querySelectorAll<HTMLButtonElement>('[role=tab]');
    tabs[0].focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    await expect(host.shadowRoot!.activeElement).toBe(tabs[2]);
  },
};
export const RightToLeft: Story = {
  args: { dir: 'rtl' },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-tabs')!;
    const tabs = host.shadowRoot!.querySelectorAll<HTMLButtonElement>('[role=tab]');
    tabs[0].focus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    await expect(host.shadowRoot!.activeElement).toBe(tabs[2]);
  },
};
