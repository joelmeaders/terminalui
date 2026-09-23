import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/file-input';
const meta = {
  title: 'Forms/File input',
  component: 't-file-input',
  tags: ['autodocs'],
  args: {
    label: 'Attachments',
    accept: '.txt,.json',
    multiple: false,
    required: false,
    disabled: false,
    error: '',
    help: 'Files remain on your device until your application submits them.',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Native file picker. Read files as FileList|null. Assign a FileList from DataTransfer for application-provided files. Each selected File appears under name in FormData. Reset clears selection. accept is a picker hint, not file validation. Supports multiple, capture, required, disabled, and external form association. This component never uploads files. CSS part: input.',
      },
    },
  },
  render: (a) =>
    html`<t-file-input
      label=${a.label}
      accept=${a.accept}
      ?multiple=${a.multiple}
      ?required=${a.required}
      ?disabled=${a.disabled}
      error=${a.error}
      help=${a.help}
    ></t-file-input>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-file-input')!;
    await userEvent.upload(
      host.shadowRoot!.querySelector('input')!,
      new File(['example'], 'notes.txt', { type: 'text/plain' }),
    );
    await expect(host.files?.[0].name).toBe('notes.txt');
  },
};
export const Multiple: Story = { args: { multiple: true } };
export const Required: Story = { args: { required: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = { args: { error: 'Select a text file.' } };
