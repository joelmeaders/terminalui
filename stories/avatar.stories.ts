import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/avatar';
const meta = {
  title: 'Components/Avatar',
  component: 't-avatar',
  tags: ['autodocs'],
  args: { name: 'Ellen Ripley', src: '', size: 'medium' },
  argTypes: { size: { control: 'select', options: ['small', 'medium', 'large'] } },
  render: (a) => html`<t-avatar name=${a.name} src=${a.src} size=${a.size}></t-avatar>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Initials: Story = {};
export const Anonymous: Story = { args: { name: '' } };
export const Large: Story = { args: { size: 'large' } };
export const Image: Story = {
  args: {
    src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%2339453a"/%3E%3Ccircle cx="40" cy="30" r="14" fill="%23a6ed91"/%3E%3Cpath d="M12 80V65a28 28 0 0 1 56 0v15" fill="%23a6ed91"/%3E%3C/svg%3E',
  },
};
