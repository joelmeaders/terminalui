import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/input';
import '../src/components/icon-button';
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
          'Form-associated input with value, name, label, help, required, disabled, readonly, type, autocomplete, min, max, step, pattern, minlength, maxlength, and multiple (email). Supports text, email, password, search, tel, url, number, date, datetime-local, month, time, week, and color. Use label to name the internal input. Emits standard composed input/change events. CSS part: input. Supports FormData, validation, reset, external forms, and Enter submission.',
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
export const WithAction: Story = {
  render: () =>
    html`<t-input label="Search archive" type="search" value="Survey">
      <t-icon slot="start" name="search"></t-icon>
      <t-icon-button
        slot="end"
        name="close"
        label="Clear search"
        @click=${(event: Event) => {
          const field = (event.currentTarget as HTMLElement)
            .parentElement as import('../src/components/input').TInput;
          field.value = '';
          field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          field.focus();
        }}
      ></t-icon-button>
    </t-input>`,
  play: async ({ canvasElement }) => {
    const field = canvasElement.querySelector('t-input')!;
    await userEvent.click(
      canvasElement.querySelector('t-icon-button')!.shadowRoot!.querySelector('button')!,
    );
    await expect(field.value).toBe('');
    await expect(field.shadowRoot!.activeElement).toBe(field.shadowRoot!.querySelector('input'));
  },
};
export const DisabledWithAction: Story = {
  render: () =>
    html`<t-input label="Search archive" disabled value="Survey"
      ><t-icon slot="start" name="search"></t-icon
      ><t-icon-button slot="end" name="close" label="Clear search"></t-icon-button
    ></t-input>`,
};
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
export const NumberConstraints: Story = {
  render: () =>
    html`<t-input
      type="number"
      label="Worker count"
      value="3"
      min="2"
      max="10"
      step="2"
      help="An even number from 2 to 10."
    ></t-input>`,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('t-input')!.checkValidity()).toBe(false);
  },
};
export const Date: Story = {
  args: {
    type: 'date',
    label: 'Start date',
    value: '2026-09-23',
    placeholder: '',
    help: 'Uses the browser date picker.',
  },
};
