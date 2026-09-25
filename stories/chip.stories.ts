import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/chip';
import '../src/components/icon';

const meta = {
  title: 'Components/Chip',
  component: 't-chip',
  tags: ['autodocs'],
  args: {
    label: 'Engineering',
    variant: 'accent',
    size: 'medium',
    selectable: true,
    selected: false,
    removable: true,
    disabled: false,
  },
  argTypes: {
    variant: { control: 'select', options: ['neutral', 'accent', 'success', 'warning', 'danger'] },
    size: { control: 'select', options: ['small', 'medium', 'large'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A compact filter or token with separate selection and removal actions. Selection uses a native pressed button. Removal emits t-remove; the application removes the element and moves focus to a logical next control. Decorative icons use start and end slots.',
      },
    },
  },
  render: (args) =>
    html`<t-chip
      label=${args.label}
      variant=${args.variant}
      size=${args.size}
      ?selectable=${args.selectable}
      ?selected=${args.selected}
      ?removable=${args.removable}
      ?disabled=${args.disabled}
    ></t-chip>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const chip = canvasElement.querySelector('t-chip')!;
    const action = chip.shadowRoot!.querySelector<HTMLButtonElement>('.action')!;
    await userEvent.click(action);
    await expect(chip.selected).toBe(true);
    await expect(action.getAttribute('aria-pressed')).toBe('true');
  },
};
export const Static: Story = { args: { variant: 'neutral', selectable: false, removable: false } };
export const Selected: Story = { args: { selected: true } };
export const Removable: Story = { args: { selectable: false } };
export const Disabled: Story = { args: { disabled: true, selected: true } };
export const LongLabel: Story = {
  args: { label: 'Atmospheric processing and environmental monitoring' },
};
export const Sizes: Story = {
  render: () =>
    html`<div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px">
      <t-chip label="Small" size="small" selectable></t-chip>
      <t-chip label="Medium" size="medium" selectable></t-chip>
      <t-chip label="Large" size="large" selectable></t-chip>
    </div>`,
};
export const Variants: Story = {
  render: () =>
    html`<div style="display:flex;flex-wrap:wrap;gap:12px">
      <t-chip label="Neutral"></t-chip>
      <t-chip label="Selected" variant="accent" selectable selected></t-chip>
      <t-chip label="Operational" variant="success"></t-chip>
      <t-chip label="Limited" variant="warning"></t-chip>
      <t-chip label="Offline" variant="danger"></t-chip>
    </div>`,
};
export const WithIcons: Story = {
  render: () =>
    html`<t-chip label="Engineering" variant="accent" selectable removable>
      <t-icon slot="start" name="folder" size="14"></t-icon>
    </t-chip>`,
};
