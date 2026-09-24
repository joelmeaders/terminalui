import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import motionGuide from '../docs/motion.md?raw';
import '../src/index';
const meta = {
  title: 'Patterns/Motion',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: motionGuide.replace(/^# .+\n/, ''),
      },
    },
  },
  render: () =>
    html`<t-stack
      ><t-stack direction="row" wrap
        ><t-button>Press me</t-button><t-button loading>Saving example</t-button
        ><t-checkbox switch label="Enable telemetry"></t-checkbox></t-stack
      ><t-progress label="Loading example"></t-progress><t-skeleton animated></t-skeleton
      ><t-popover label="Open settings" heading="Preview settings"
        ><t-switch label="Enable preview" checked></t-switch></t-popover
    ></t-stack>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const DevicePreference: Story = {};
export const Disabled: Story = { globals: { motion: 'off' } };
