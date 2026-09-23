import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/icon';
import { icons } from '../src/components/icon';
const meta = {
  title: 'Components/Icon',
  component: 't-icon',
  tags: ['autodocs'],
  args: { name: 'search', label: 'Search', size: 24 },
  argTypes: { name: { control: 'select', options: Object.keys(icons) } },
  render: (a) => html`<t-icon name=${a.name} label=${a.label} .size=${a.size}></t-icon>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Named: Story = {};
export const Decorative: Story = { args: { label: '' } };
export const Catalog: Story = {
  render: () =>
    html`<div
      style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:24px"
    >
      ${Object.keys(icons).map((name) => html`<div style="display:grid;gap:12px"><t-icon name=${name}></t-icon><span>${name}</span></div>`)}
    </div>`,
};
