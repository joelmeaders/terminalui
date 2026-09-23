import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
const meta = {
  title: 'Patterns/HTML form',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Standard HTML form integration. Custom fields participate through ElementInternals. A native submit/reset button preserves submitter and implicit browser behavior. Listen to each field’s input/change event for framework binding.',
      },
    },
  },
  render: () =>
    html`<form
      @submit=${(event: SubmitEvent) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        form.querySelector('output')!.textContent = JSON.stringify(
          Object.fromEntries(new FormData(form)),
        );
      }}
      style="display:grid;gap:16px;max-width:480px"
    >
      <t-input name="name" label="Workspace name" required></t-input
      ><t-select
        name="type"
        label="Workspace type"
        value="web"
        .options=${[
          { value: 'web', label: 'Website' },
          { value: 'app', label: 'Application' },
        ]}
      ></t-select
      ><t-checkbox name="logging" label="Enable logging" checked></t-checkbox>
      <div>
        <button class="t-native" type="submit">Save</button>
        <button class="t-native" type="reset">Reset</button>
      </div>
      <output aria-label="Saved configuration"></output>
    </form>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const SaveAndReset: Story = {
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('t-input')!.shadowRoot!.querySelector('input')!;
    await userEvent.type(input, 'Explorer');
    await userEvent.click(canvasElement.querySelector('button[type=submit]')!);
    await expect(canvasElement.querySelector('output')).toHaveTextContent('Explorer');
    await expect(canvasElement.querySelector('output')).toHaveTextContent('"logging":"on"');
    await userEvent.click(canvasElement.querySelector('button[type=reset]')!);
    await expect(input).toHaveValue('');
  },
};
