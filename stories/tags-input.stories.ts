import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/tags-input';
const meta = {
  title: 'Forms/Tags input',
  component: 't-tags-input',
  tags: ['autodocs'],
  args: {
    label: 'Skills',
    values: ['Lit'],
    maxTags: 0,
    required: false,
    disabled: false,
    error: '',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Unique text tags. Set values to a string array, or value to a JSON array string such as ["Lit","TypeScript"]. FormData submits repeated name entries, one per tag. Enter, comma, or blur commits the entry. Backspace in an empty entry removes the last tag. Every removal button has a specific name. addTag(value) returns success; removeTag(value) removes a tag. required and maxTags enforce the tag count. Malformed JSON fails validation. No network requests.',
      },
    },
  },
  render: (a) =>
    html`<t-tags-input
      label=${a.label}
      .values=${a.values}
      max-tags=${a.maxTags}
      ?required=${a.required}
      ?disabled=${a.disabled}
      error=${a.error}
    ></t-tags-input>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-tags-input')!;
    await userEvent.type(host.shadowRoot!.querySelector('input')!, 'TypeScript{Enter}');
    await expect(host.values).toEqual(['Lit', 'TypeScript']);
  },
};
export const EmptyRequired: Story = { args: { values: [], required: true } };
export const Limited: Story = { args: { values: ['Lit', 'TypeScript'], maxTags: 2 } };
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = { args: { error: 'Choose at least two relevant skills.' } };
export const LiveActions: Story = {
  args: { values: ['Lit', 'TypeScript', 'CSS'] },
  parameters: {
    docs: {
      description: {
        story:
          'Removal actions retain tag identity after reordering. Removing the focused tag externally returns focus to the entry without a user event.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-tags-input')!;
    const action = host.shadowRoot!.querySelector<HTMLButtonElement>(
      '[aria-label="Remove TypeScript"]',
    )!;
    action.focus();
    host.values = ['CSS', 'Lit', 'TypeScript'];
    await host.updateComplete;
    await expect(host.shadowRoot!.activeElement).toBe(action);
    await expect(action).toHaveAttribute('aria-label', 'Remove TypeScript');
    host.values = ['CSS'];
    await host.updateComplete;
    await expect(host.shadowRoot!.activeElement).toBe(host.shadowRoot!.querySelector('input'));
  },
};
export const DisabledActions: Story = {
  args: { values: ['Lit', 'TypeScript'] },
  parameters: {
    docs: {
      description: {
        story:
          'Disabling a focused removal action uses the named selected-tag list. Keyboard users can then leave the disabled control.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-tags-input')!;
    host.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Remove TypeScript"]')!.focus();
    host.disabled = true;
    await host.updateComplete;
    await expect(host.shadowRoot!.activeElement).toBe(host.shadowRoot!.querySelector('.tags'));
    await expect(host.shadowRoot!.activeElement).toHaveAttribute('aria-label', 'Skills selected');
  },
};
