import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent, fn } from 'storybook/test';
import '../src/components/button';
import '../src/components/input';
const meta = {
  title: 'Components/Button',
  component: 't-button',
  tags: ['autodocs'],
  args: {
    label: 'Initialize',
    variant: 'primary',
    size: 'medium',
    disabled: false,
    loading: false,
    onClick: fn(),
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['small', 'medium', 'large'] },
    onClick: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Button with native keyboard behavior. type defaults to button and also supports submit/reset. Set name and value for submitter data. Use the form attribute for an external form. Submit uses a temporary native button, exposed as event.submitter. Read new FormData(form, event.submitter) to include its value. A canceled click prevents its action. Slots: default label. CSS part: button. Event: native click.',
      },
    },
  },
  render: (a) =>
    html`<t-button
      variant=${a.variant}
      size=${a.size}
      ?disabled=${a.disabled}
      ?loading=${a.loading}
      @click=${a.onClick}
      >${a.label}</t-button
    >`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Primary: Story = {
  play: async ({ canvasElement, args }) => {
    const button = canvasElement.querySelector('t-button')!.shadowRoot!.querySelector('button')!;
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Danger: Story = { args: { variant: 'danger', label: 'Discard' } };
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('t-button')!.shadowRoot!.querySelector('button'),
    ).toBeDisabled();
  },
};
export const Loading: Story = { args: { loading: true, label: 'Processing' } };
export const FormActions: Story = {
  render: () =>
    html`<form
      @submit=${(event: SubmitEvent) => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement;
        form.querySelector('output')!.textContent = JSON.stringify(
          Object.fromEntries(new FormData(form, event.submitter)),
        );
      }}
    >
      <t-input label="Callsign" name="callsign" value="Explorer" required></t-input>
      <t-button type="submit" name="action" value="save">Save</t-button>
      <t-button type="reset" variant="secondary">Reset</t-button
      ><output aria-live="polite"></output>
    </form>`,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      canvasElement.querySelector('t-button')!.shadowRoot!.querySelector('button')!,
    );
    await expect(canvasElement.querySelector('output')).toHaveTextContent('"action":"save"');
  },
};
