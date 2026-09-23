import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/spinner';
const meta = {
  title: 'Components/Spinner',
  component: 't-spinner',
  tags: ['autodocs'],
  args: { label: 'Loading records', size: 'medium' },
  argTypes: { size: { control: 'select', options: ['small', 'medium', 'large'] } },
  render: (a) => html`<t-spinner label=${a.label} size=${a.size}></t-spinner>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {};
export const Small: Story = { args: { size: 'small' } };
export const Large: Story = { args: { size: 'large' } };
