import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/split-pane';
const meta = {
  title: 'Layout/Split pane',
  component: 't-split-pane',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Two accessible scroll regions with a 24px separator target. Drag the separator or use arrows, Shift+arrows, Home, and End. Enter moves the primary pane to its minimum size or restores its previous size. An initially minimized pane opens at the midpoint. Set `min=0` for full primary collapse or `max=100` for full secondary collapse. Collapsed content leaves the visual and keyboard flow. The separator uses the primary pane name by default. `size`, `min`, and `max` are primary-pane percentages. `orientation` describes pane layout, so side-by-side panes have a vertical separator. Horizontal panes stack below `stack-at` pixels (480 by default, 0 disables). `--t-split-height` controls height (360px default). Slots are `primary` and `secondary`. `t-input` reports previews; `t-change` reports completed pointer changes or keyboard changes. Details contain `{ size, orientation, source }`.',
      },
    },
  },
  render: () =>
    html`<t-split-pane stack-at="0" primary-label="Document list" secondary-label="Document preview"
      ><p slot="primary">Document list</p>
      <p slot="secondary">Use the separator to change the available space.</p></t-split-pane
    >`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const split = canvasElement.querySelector('t-split-pane')!;
    const handle = split.shadowRoot!.querySelector<HTMLElement>('[role=separator]')!;
    await userEvent.click(handle);
    await userEvent.keyboard('{ArrowRight}');
    await expect(split.size).toBe(51);
    await userEvent.keyboard('{Enter}');
    await expect(split.size).toBe(10);
    await userEvent.keyboard('{Enter}');
    await expect(split.size).toBe(51);
  },
};
export const Responsive: Story = {
  render: () =>
    html`<div style="max-width:320px">
      <t-split-pane
        ><p slot="primary">Primary pane stacks above the secondary pane on narrow screens.</p>
        <p slot="secondary">Both panes remain scrollable and keyboard accessible.</p></t-split-pane
      >
    </div>`,
};
export const Collapsed: Story = {
  render: () =>
    html`<t-split-pane min="0" max="100" size="0" primary-label="Files" secondary-label="Preview"
      ><p slot="primary">The files pane is restored.</p>
      <p slot="secondary">Press Enter on the divider to restore the files pane.</p></t-split-pane
    >`,
  play: async ({ canvasElement }) => {
    const split = canvasElement.querySelector('t-split-pane')!;
    const handle = split.shadowRoot!.querySelector<HTMLElement>('[role=separator]')!;
    await expect(split.shadowRoot!.querySelector('[part=primary]')).toHaveAttribute('hidden');
    handle.focus();
    await userEvent.keyboard('{Enter}');
    await expect(split.size).toBe(50);
    await expect(split.shadowRoot!.querySelector('[part=primary]')).not.toHaveAttribute('hidden');
  },
};
export const Vertical: Story = {
  render: () =>
    html`<t-split-pane orientation="vertical" size="35"
      ><p slot="primary">Top content</p>
      <p slot="secondary">Bottom content</p></t-split-pane
    >`,
};
export const Disabled: Story = {
  render: () =>
    html`<t-split-pane disabled
      ><p slot="primary">Primary pane</p>
      <p slot="secondary">Resizing is unavailable.</p></t-split-pane
    >`,
};
