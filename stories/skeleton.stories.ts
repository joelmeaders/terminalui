import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/skeleton';
const meta = {
  title: 'Components/Skeleton',
  component: 't-skeleton',
  tags: ['autodocs'],
  args: { shape: 'text', animated: false },
  argTypes: { shape: { control: 'select', options: ['text', 'circle', 'rectangle'] } },
  render: (a) =>
    html`<div style="width:240px">
      <t-skeleton shape=${a.shape} ?animated=${a.animated}></t-skeleton>
    </div>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Text: Story = {};
export const Circle: Story = { args: { shape: 'circle' } };
export const Rectangle: Story = { args: { shape: 'rectangle', animated: true } };
export const LoadingCard: Story = {
  render: () =>
    html`<t-card aria-busy="true" aria-label="Loading profile"
      ><div style="display:grid;gap:16px">
        <t-skeleton shape="circle"></t-skeleton><t-skeleton></t-skeleton
        ><t-skeleton style="--t-skeleton-width:65%"></t-skeleton></div
    ></t-card>`,
};
