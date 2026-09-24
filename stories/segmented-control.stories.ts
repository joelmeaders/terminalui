import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/segmented-control';
const options = [
  { value: 'list', label: 'List' },
  { value: 'grid', label: 'Grid' },
  { value: 'chart', label: 'Chart', disabled: true },
];
const meta = {
  title: 'Forms/Segmented control',
  component: 't-segmented-control',
  tags: ['autodocs'],
  args: {
    label: 'Display mode',
    value: 'list',
    disabled: false,
    required: false,
    error: '',
    orientation: 'horizontal',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Native radio choices with segmented borders. options accepts {value,label,disabled?} objects. Arrow keys skip disabled choices. value, name, required, error, reset and disabled fieldsets behave as in Radio group. Long labels wrap; orientation supports horizontal or vertical.',
      },
    },
  },
  render: (a) =>
    html`<t-segmented-control
      label=${a.label}
      .value=${a.value}
      .options=${options}
      ?disabled=${a.disabled}
      ?required=${a.required}
      orientation=${a.orientation}
      error=${a.error}
    ></t-segmented-control>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta.args>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-segmented-control')!;
    await userEvent.click(host.shadowRoot!.querySelectorAll('input')[1]);
    await expect(host.value).toBe('grid');
  },
};
export const Vertical: Story = { args: { orientation: 'vertical' } };
export const Disabled: Story = { args: { disabled: true } };
export const Required: Story = { args: { required: true, value: '' } };
export const Invalid: Story = { args: { error: 'Choose an available display mode.' } };
