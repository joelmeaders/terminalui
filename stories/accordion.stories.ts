import '../src/components/icon';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
const meta = {
  title: 'Components/Accordion',
  component: 't-accordion',
  tags: ['autodocs'],
  args: { label: 'What is Terminal Kit?', open: false },
  parameters: {
    docs: {
      description: {
        component:
          'A native details/summary disclosure. `open` is a reactive boolean. Emits `t-toggle` with `detail.open`. CSS parts: `summary`, `content`.',
      },
    },
  },
  render: (a) =>
    html`<t-accordion label=${a.label} ?open=${a.open}
      >Reusable components for websites and applications.</t-accordion
    >`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Collapsed: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-accordion')!;
    await userEvent.click(host.shadowRoot!.querySelector('summary')!);
    await expect(host.shadowRoot!.querySelector('details')).toHaveAttribute('open');
  },
};
export const Expanded: Story = { args: { open: true } };

export const WithSlots: Story = {
  render: () =>
    html`<t-accordion label="Archive details"
      ><t-icon slot="start" name="folder"></t-icon><span slot="end">3 files</span>Three files are
      ready for review.</t-accordion
    >`,
};
