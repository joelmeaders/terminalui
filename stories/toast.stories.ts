import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../src/components/toast';
import '../src/components/button';
import '../src/components/icon';
import { expect, userEvent } from 'storybook/test';
import type { TToast } from '../src/components/toast';
const meta = {
  title: 'Components/Toast',
  component: 't-toast',
  tags: ['autodocs'],
  args: {
    message: 'Your configuration was saved.',
    variant: 'success',
    urgent: false,
    duration: 0,
    countdown: 'none',
    countdownUnit: 'seconds',
  },
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'danger'] },
    countdown: { control: 'select', options: ['none', 'bar', 'spinner'] },
    countdownUnit: { control: 'select', options: ['seconds', 'milliseconds'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Dismissible status notification. Set a positive `duration` in milliseconds to auto-dismiss. `countdown="bar"` shows a shrinking bar. `countdown="spinner"` shows a rotating ring with remaining time. Use `countdown-unit="seconds"` or `"milliseconds"`. The default is no indicator and a persistent duration of zero. Hover, focus, and hidden tabs pause the timer and indicator. Motion preferences stop rotation and limit visual updates to once per second. The countdown stays outside the live region. Keep critical messages persistent or available elsewhere. Changing the message or duration restarts the timer. Changing the indicator or unit preserves remaining time. Use Show notification to restart a timed example.',
      },
    },
  },
  render: (a) =>
    html`<t-toast
      open
      message=${a.message}
      variant=${a.variant}
      ?urgent=${a.urgent}
      .duration=${a.duration}
      countdown=${a.countdown}
      countdown-unit=${a.countdownUnit}
    ></t-toast>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Persistent: Story = {
  play: async ({ canvasElement }) => {
    const toast = canvasElement.querySelector('t-toast') as TToast;
    await userEvent.click(toast.shadowRoot!.querySelector('button')!);
    await expect(toast.open).toBe(false);
  },
};
export const Warning: Story = {
  args: { variant: 'warning', message: 'Connection lost. Your changes are stored locally.' },
};
export const Urgent: Story = {
  args: { variant: 'danger', urgent: true, message: 'Your session has ended. Sign in again.' },
};
const timedRender: Story['render'] = (args) =>
  html`<t-stack>
    <t-button
      @click=${(event: Event) => {
        const trigger = event.currentTarget as HTMLElement;
        (trigger.nextElementSibling as TToast).show(undefined, trigger);
      }}
      >Show notification</t-button
    >${meta.render(args)}
  </t-stack>`;
const timedPlay: Story['play'] = async ({ canvasElement }) => {
  const trigger = canvasElement.querySelector('t-button')!;
  const toast = canvasElement.querySelector('t-toast')!;
  await userEvent.click(trigger.shadowRoot!.querySelector('button')!);
  await expect(await toast.updateComplete).toBe(true);
  await expect(toast.open).toBe(true);
  await expect(toast.shadowRoot!.querySelector('[role=status]')).toHaveTextContent(
    'Your configuration was saved.',
  );
  await expect(toast.shadowRoot!.querySelector('[part=countdown]')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  const close = toast.shadowRoot!.querySelector<HTMLButtonElement>('button')!;
  close.focus();
  await toast.updateComplete;
  await expect(toast.shadowRoot!.activeElement).toBe(close);
};
export const CountdownBar: Story = {
  render: timedRender,
  play: timedPlay,
  args: { duration: 8000, countdown: 'bar' },
};
export const CountdownSeconds: Story = {
  render: timedRender,
  play: timedPlay,
  args: { duration: 8000, countdown: 'spinner' },
};
export const CountdownMilliseconds: Story = {
  render: timedRender,
  play: timedPlay,
  args: { duration: 8000, countdown: 'spinner', countdownUnit: 'milliseconds' },
};
export const Triggered: Story = {
  render: () =>
    html`<t-stack
      ><t-button
        @click=${(e: Event) => {
          (e.currentTarget as HTMLElement)
            .parentElement!.querySelector<TToast>('t-toast')!
            .show('Configuration saved.', e.currentTarget as HTMLElement);
        }}
        >Save configuration</t-button
      ><t-toast variant="success"></t-toast
    ></t-stack>`,
};

export const WithActions: Story = {
  render: () =>
    html`<section>
      <t-button
        @click=${(event: Event) => {
          const section = (event.currentTarget as HTMLElement).closest('section')!;
          section.querySelector('[data-archive-state]')!.textContent = 'Draft archived.';
          section
            .querySelector('t-toast')!
            .show('Draft archived.', event.currentTarget as HTMLElement);
        }}
        >Archive local draft</t-button
      >
      <p data-archive-state style="margin:12px 0">Draft is active.</p>
      <t-toast>
        <t-icon slot="icon" name="check"></t-icon>
        <t-button
          slot="actions"
          variant="secondary"
          @click=${(event: Event) => {
            const section = (event.currentTarget as HTMLElement).closest('section')!;
            section.querySelector('[data-archive-state]')!.textContent =
              'Archive undone. Draft is active.';
            section.querySelector('t-toast')!.close();
          }}
          >Undo archive</t-button
        >
      </t-toast>
    </section>`,
  play: async ({ canvasElement }) => {
    const buttons = canvasElement.querySelectorAll('t-button');
    await userEvent.click(buttons[0].shadowRoot!.querySelector('button')!);
    await expect(canvasElement.querySelector('t-toast')!.open).toBe(true);
    await expect(
      canvasElement.querySelector('t-toast')!.shadowRoot!.querySelector('[role=status]'),
    ).toHaveTextContent('Draft archived.');
    await userEvent.click(buttons[1].shadowRoot!.querySelector('button')!);
    await expect(canvasElement.querySelector('[data-archive-state]')).toHaveTextContent(
      'Archive undone. Draft is active.',
    );
    await expect(canvasElement.querySelector('t-toast')!.open).toBe(false);
  },
};
