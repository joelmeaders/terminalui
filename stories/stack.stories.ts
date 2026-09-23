import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/stack';
const meta = {
  title: 'Layout/Stack',
  component: 't-stack',
  tags: ['autodocs'],
  args: { direction: 'column', align: 'stretch', justify: 'start', wrap: false },
  argTypes: {
    direction: { control: 'select', options: ['column', 'row'] },
    align: { control: 'select', options: ['stretch', 'start', 'center', 'end'] },
    justify: { control: 'select', options: ['start', 'end', 'center', 'between'] },
  },
  render: (a) =>
    html`<t-stack direction=${a.direction} align=${a.align} justify=${a.justify} ?wrap=${a.wrap}
      ><t-button>Initialize</t-button><t-button variant="secondary">Settings</t-button
      ><t-badge>Ready</t-badge></t-stack
    >`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Vertical: Story = {};
export const Row: Story = { args: { direction: 'row', align: 'center', wrap: true } };
export const Spaced: Story = { args: { direction: 'row', align: 'center', justify: 'between' } };
