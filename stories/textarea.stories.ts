import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/textarea';
const meta = {
  title: 'Forms/Textarea',
  component: 't-textarea',
  tags: ['autodocs'],
  args: {
    label: 'Deployment notes',
    value: '',
    help: 'Describe the change.',
    required: false,
    disabled: false,
    readonly: false,
    error: '',
    rows: 4,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Native multiline field. Supports name, value, rows, minlength, maxlength, readonly, resize, autocomplete, native FormData, reset, and constraint validation. Emits standard composed input/change events. CSS part: textarea. Initial property values become reset defaults.',
      },
    },
  },
  render: (a) =>
    html`<t-textarea
      label=${a.label}
      .value=${a.value}
      help=${a.help}
      ?required=${a.required}
      ?disabled=${a.disabled}
      ?readonly=${a.readonly}
      error=${a.error}
      rows=${a.rows}
    ></t-textarea>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-textarea')!;
    await userEvent.type(host.shadowRoot!.querySelector('textarea')!, 'Ready for review');
    await expect(host.value).toBe('Ready for review');
  },
};
export const Required: Story = { args: { required: true } };
export const Invalid: Story = { args: { error: 'Enter deployment notes.' } };
export const Disabled: Story = { args: { disabled: true, value: 'Locked notes' } };
export const Readonly: Story = { args: { readonly: true, value: 'Approved notes' } };
