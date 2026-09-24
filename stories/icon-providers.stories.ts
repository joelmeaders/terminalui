import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { providerExamples } from '../demo/icons';
import iconGuide from '../docs/icons.md?raw';
import '../src/components/icon';
import '../src/components/icon-button';
const meta = {
  title: 'Patterns/Icon providers',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: iconGuide.replace(/^# .+\n/, ''),
      },
    },
  },
  render: () =>
    html`<div style="display:flex;gap:24px;flex-wrap:wrap">
      ${providerExamples.map((icon) => html`<div style="display:grid;gap:12px;justify-items:center"><t-icon name=${icon.name} label=${icon.provider} size="32"></t-icon><span>${icon.provider}</span></div>`)}
    </div>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Providers: Story = {};
export const IconActions: Story = {
  render: () =>
    html`<div style="display:flex;gap:16px">
      <t-icon-button name="ion:rocket" label="Launch application"></t-icon-button
      ><t-icon-button name="fa:github" label="Open source repository"></t-icon-button
      ><t-icon-button name="lucide:search" label="Search records"></t-icon-button>
    </div>`,
};
