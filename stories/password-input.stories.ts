import '../src/components/icon';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/password-input';
const meta = {
  title: 'Forms/Password input',
  component: 't-password-input',
  tags: ['autodocs'],
  args: {
    label: 'Account password',
    value: '',
    revealed: false,
    disabled: false,
    readonly: false,
    required: false,
    error: '',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Password field with a named Show/Hide action. Preserves the input selection and focus during pointer activation. Keyboard activation keeps focus on the action. Inherits input constraints, autocomplete, native FormData and reset. revealed controls visibility; reset hides the value. Emits standard input/change plus t-visibility-change with {revealed}.',
      },
    },
  },
  render: (a) =>
    html`<t-password-input
      label=${a.label}
      .value=${a.value}
      ?revealed=${a.revealed}
      ?disabled=${a.disabled}
      ?readonly=${a.readonly}
      ?required=${a.required}
      error=${a.error}
    ></t-password-input>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-password-input')!;
    await userEvent.type(host.shadowRoot!.querySelector('input')!, 'Example password');
    await userEvent.click(host.shadowRoot!.querySelector('button')!);
    await expect(host.revealed).toBe(true);
    await expect(host.value).toBe('Example password');
  },
};
export const Revealed: Story = { args: { revealed: true, value: 'Example password' } };
export const Disabled: Story = { args: { disabled: true, value: 'Example password' } };
export const Readonly: Story = { args: { readonly: true, value: 'Example password' } };
export const Invalid: Story = { args: { error: 'Use at least twelve characters.' } };

export const WithSlots: Story = {
  render: () =>
    html`<t-password-input label="Access key" value="example-only"
      ><t-icon slot="start" name="info"></t-icon
    ></t-password-input>`,
};
