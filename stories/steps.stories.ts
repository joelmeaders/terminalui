import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/steps';
const items = [
  { id: 'details', label: 'Project details', status: 'complete' as const },
  {
    id: 'review',
    label: 'Review request',
    description: 'Check all information',
    status: 'error' as const,
  },
  { id: 'confirm', label: 'Confirmation', disabled: true },
];
const meta = {
  title: 'Navigation/Steps',
  component: 't-steps',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Ordered navigation, not a wizard controller. Set `items` and `value`. Status text communicates complete, pending, or error states without relying on color. Disabled steps use native disabled buttons. User selection emits `t-select` with `{ value, index, step }`; the application owns page content and validation. Horizontal layouts wrap at narrow widths.',
      },
    },
  },
  render: () => html`<t-steps .items=${items} value="review"></t-steps>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const steps = canvasElement.querySelector('t-steps')!;
    await userEvent.click(steps.shadowRoot!.querySelector('button')!);
    await expect(steps.value).toBe('details');
  },
};
export const Vertical: Story = {
  render: () => html`<t-steps orientation="vertical" .items=${items} value="review"></t-steps>`,
};
export const Empty: Story = {
  render: () => html`<t-steps label="Request steps"></t-steps>`,
};
export const LiveActions: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Stable item IDs preserve focused actions during insertion and reordering. Removing the last action leaves focus on the named navigation region. Application focus moves take precedence.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const steps = canvasElement.querySelector('t-steps')!;
    const review = steps.shadowRoot!.querySelector<HTMLButtonElement>('[data-step-id="review"]')!;
    review.focus();
    steps.items = [{ id: 'prepare', label: 'Preparation' }, ...items];
    await steps.updateComplete;
    await expect(steps.shadowRoot!.activeElement).toBe(review);
    steps.items = [];
    await steps.updateComplete;
    await expect(steps.shadowRoot!.activeElement).toBe(steps.shadowRoot!.querySelector('nav'));
  },
};
export const LongLabels: Story = {
  render: () =>
    html`<div style="max-width:280px">
      <t-steps
        .items=${[
          {
            id: 'one',
            label: 'Review the complete project configuration',
            description: 'Check the workspace, participants, and notification settings.',
          },
          { id: 'two', label: 'Confirm the requested project changes' },
        ]}
      ></t-steps>
    </div>`,
};
