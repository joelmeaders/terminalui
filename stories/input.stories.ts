import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
const meta = {
  title: 'Components/Input',
  component: 't-input',
  tags: ['autodocs'],
  args: {
    label: 'Callsign',
    name: 'callsign',
    value: '',
    help: 'A name for your workspace.',
    placeholder: 'EXPLORER-01',
    required: false,
    disabled: false,
    error: '',
    type: 'text',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Form-associated input with `value`, `name`, `label`, `help`, `required`, `disabled`, `readonly`, `type`, and `autocomplete`. Use `label` to name the internal input. Emits composed `input` and `change` events. CSS part: `input`. Supports native FormData, validation, and reset.',
      },
    },
  },
  render: (a) =>
    html`<t-input
      label=${a.label}
      name=${a.name}
      .value=${a.value}
      help=${a.help}
      placeholder=${a.placeholder}
      ?required=${a.required}
      ?disabled=${a.disabled}
      error=${a.error}
      type=${a.type}
    ></t-input>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-input')!;
    await userEvent.type(host.shadowRoot!.querySelector('input')!, 'NOSTROMO');
    await expect(host.value).toBe('NOSTROMO');
  },
};
export const Required: Story = { args: { required: true } };
export const Invalid: Story = { args: { error: 'Enter a valid workspace name.' } };
export const Disabled: Story = { args: { disabled: true, value: 'READ-ONLY STATION' } };
export const Email: Story = {
  args: {
    type: 'email',
    label: 'Email address',
    placeholder: 'crew@example.com',
    help: 'Uses native email validation.',
  },
};
