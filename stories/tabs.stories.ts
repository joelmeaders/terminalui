import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
const meta = {
  title: 'Components/Tabs',
  component: 't-tabs',
  tags: ['autodocs'],
  args: { active: 'overview', orientation: 'horizontal', activation: 'automatic', dir: 'ltr' },
  parameters: {
    docs: {
      description: {
        component:
          'Set `tabs` to `{id, label, disabled?}[]`. Supply a named slot for each ID. `active` selects a tab. Set `activation="manual"` when panel content takes time to load: arrows move focus, and Enter or Space selects. Horizontal tabs use Left/Right, reversed in RTL. Set `orientation="vertical"` for Up/Down. Home/End reach the first/last enabled tab. Emits `t-change` with `detail.value`. CSS parts: `tab`, `panel`.',
      },
    },
  },
  render: (a) =>
    html`<t-tabs
      label="Workspace sections"
      active=${a.active}
      orientation=${a.orientation}
      activation=${a.activation}
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
    await host.updateComplete;
    await expect(host.shadowRoot!.activeElement).toBeNull();
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
export const ManualActivation: Story = {
  args: { activation: 'manual' },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-tabs')!;
    const tabs = host.shadowRoot!.querySelectorAll<HTMLButtonElement>('[role=tab]');
    tabs[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(host.shadowRoot!.activeElement).toBe(tabs[2]);
    await expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    await expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
    await userEvent.keyboard('{Enter}');
    await expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
  },
};
export const Empty: Story = {
  render: () =>
    html`<p>No workspace sections are available.</p>
      <t-tabs label="Workspace sections"></t-tabs>`,
};
export const Unavailable: Story = {
  render: () =>
    html`<p>Workspace sections are unavailable.</p>
      <t-tabs
        label="Workspace sections"
        .tabs=${[
          { id: 'overview', label: 'Overview', disabled: true },
          { id: 'settings', label: 'Settings', disabled: true },
        ]}
        ><p slot="overview">Workspace overview.</p>
        <p slot="settings">Workspace settings.</p></t-tabs
      >`,
};
const liveTabsPlay: NonNullable<Story['play']> = async ({ canvasElement }) => {
  const host = canvasElement.querySelector('t-tabs')!;
  await host.updateComplete;
  const tabs = host.tabs;
  const list = host.shadowRoot!.querySelector<HTMLElement>('[role=tablist]')!;
  host.shadowRoot!.querySelector<HTMLButtonElement>('[role=tab]')!.focus();
  host.tabs = [];
  await host.updateComplete;
  await expect(host.shadowRoot!.activeElement).toBe(list);
  host.tabs = tabs;
  await host.updateComplete;
  await expect(host.shadowRoot!.activeElement).toBe(host.shadowRoot!.querySelector('[role=tab]'));
  host.tabs = tabs.map((tab) => ({ ...tab, disabled: true }));
  await host.updateComplete;
  await expect(host.shadowRoot!.activeElement).toBe(list);
};
export const LiveTabs: Story = { play: liveTabsPlay };
export const ManualLiveTabs: Story = { args: { activation: 'manual' }, play: liveTabsPlay };
