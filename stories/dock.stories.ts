import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/dock';
import '../src/components/button';
import '../src/components/input';
import type { TDock } from '../src/components/dock';

const meta = {
  title: 'Layout/Dock',
  component: 't-dock',
  tags: ['autodocs'],
  args: {
    label: 'Workspace dock',
    orientation: 'horizontal',
    align: 'start',
    editing: false,
    disabled: false,
    placement: 'inline',
    snapTarget: 'parent',
    width: 640,
    height: 112,
    autoOrient: true,
  },
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    align: { control: 'select', options: ['start', 'end', 'center', 'justify'] },
    placement: { control: 'select', options: ['inline', 'top', 'bottom', 'left', 'right'] },
    snapTarget: { control: 'select', options: ['parent', 'viewport'] },
  },
  render: (a) =>
    html`<section
      aria-label="Dock containment region"
      style="position:relative;width:760px;max-width:100%;min-height:420px;border:1px solid var(--t-border);padding:12px;box-sizing:border-box"
    >
      <t-dock
        label=${a.label}
        orientation=${a.orientation}
        align=${a.align}
        .editing=${a.editing}
        .disabled=${a.disabled}
        placement=${a.placement}
        snap-target=${a.snapTarget}
        .width=${a.width}
        .height=${a.height}
        .autoOrient=${a.autoOrient}
      >
        <t-button data-dock-id="archive" data-dock-label="Archive">Open archive</t-button>
        <hr data-dock-id="separator" data-dock-label="Tools separator" />
        <t-input
          data-dock-id="filter"
          data-dock-label="Record filter"
          label="Filter records"
          value="missions"
        ></t-input>
        <t-button data-dock-id="refresh" data-dock-label="Refresh">Refresh records</t-button>
      </t-dock>
    </section>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
const host = (canvas: HTMLElement) => canvas.querySelector<TDock>('t-dock')!;
export const Horizontal: Story = {};
export const Vertical: Story = { args: { orientation: 'vertical', width: 300, height: 340 } };
export const Center: Story = { args: { align: 'center' } };
export const End: Story = { args: { align: 'end' } };
export const Justify: Story = { args: { align: 'justify' } };
export const Editing: Story = {
  args: { editing: true },
  parameters: {
    docs: {
      description: {
        story:
          'Drag handles are available immediately. Dock settings opens the non-drag controls separately, so the panel does not cover the handles.',
      },
    },
  },
};
export const Settings: Story = {
  args: { editing: true },
  play: async ({ canvasElement }) => {
    const dock = host(canvasElement);
    await userEvent.click(
      dock.shadowRoot!.querySelector<HTMLButtonElement>('[part=settings-button]')!,
    );
    await dock.updateComplete;
    await expect(dock.shadowRoot!.querySelector('.editor')).toBeVisible();
    await expect(dock.shadowRoot!.activeElement).toBe(dock.shadowRoot!.querySelector('#dock-item'));
  },
};
export const LiveOrder: Story = {
  play: async ({ canvasElement }) => {
    const dock = host(canvasElement);
    const input = dock.querySelector('t-input')!.shadowRoot!.querySelector('input')!;
    input.focus();
    input.setSelectionRange(1, 4);
    const children = [...dock.children];
    dock.order = ['refresh', 'filter', 'separator', 'archive'];
    await dock.updateComplete;
    await expect(dock.querySelector('t-input')!.shadowRoot!.activeElement).toBe(input);
    await expect(input.value).toBe('missions');
    await expect([input.selectionStart, input.selectionEnd]).toEqual([1, 4]);
    await expect([...dock.children]).toEqual(children);
  },
};
export const KeyboardResize: Story = {
  args: { editing: true },
  play: async ({ canvasElement }) => {
    const dock = host(canvasElement);
    const resize = dock.shadowRoot!.querySelector<HTMLButtonElement>('[part=resize-handle]')!;
    resize.focus();
    await userEvent.keyboard('{ArrowRight}');
    await dock.updateComplete;
    await expect(dock.width).toBe(648);
    await expect(dock.shadowRoot!.activeElement).toBe(resize);
    await expect(dock.shadowRoot!.querySelector('[role=status]')).toHaveTextContent(
      'Dock size: 648 by 112 pixels.',
    );
  },
};
export const Bottom: Story = { args: { placement: 'bottom' } };
export const Left: Story = {
  args: { placement: 'left', orientation: 'vertical', width: 300, height: 340 },
};
export const Disabled: Story = { args: { disabled: true } };
export const Empty: Story = {
  render: () => html`<t-dock label="Empty workspace dock"></t-dock>`,
};
