import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, waitFor, within } from 'storybook/test';
import { ImageEffectsDocs } from '../.storybook/docs/ImageEffectsDocs';
import { mountPixelation } from '../src/effects/pixelate';
import { mountAscii } from '../src/effects/ascii';
import type { ImageEffectController } from '../src/effects/shared';
import imageUrl from '../tests/assets/effect-image.svg?url';
import '../src/image-effects.css';

class ImageEffectDemo extends HTMLElement {
  private controller?: ImageEffectController<unknown>;

  connectedCallback() {
    const mode = this.getAttribute('mode');
    this.innerHTML = `<span class="t-image-effect" style="width:180px" ${
      mode === 'scanlines' ? 'data-image-scanlines="pronounced" data-image-tint' : ''
    }><img src="${imageUrl}" width="180" height="120" style="width:180px;height:120px" alt="Dark square and gray circle on a light background"></span>`;
    const image = this.querySelector('img')!;
    if (mode === 'pixelate') this.controller = mountPixelation(image, { pixelSize: 12 });
    if (mode === 'ascii') this.controller = mountAscii(image);
  }

  disconnectedCallback() {
    this.controller?.destroy();
    this.controller = undefined;
  }
}
if (!customElements.get('hf-image-effect-demo'))
  customElements.define('hf-image-effect-demo', ImageEffectDemo);

const meta = {
  title: 'Introduction/Image Effects',
  tags: ['autodocs'],
  parameters: { docs: { page: ImageEffectsDocs } },
  render: () => html`<hf-image-effect-demo mode="scanlines"></hf-image-effect-demo>`,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
export const ScanlinesAndTint: Story = {};
export const Pixelation: Story = {
  render: () => html`<hf-image-effect-demo mode="pixelate"></hf-image-effect-demo>`,
  play: async ({ canvasElement }) => {
    const image = within(canvasElement).getByRole('img', {
      name: 'Dark square and gray circle on a light background',
    });
    await expect(image).toBeInTheDocument();
    await waitFor(() =>
      expect(image.parentElement).toHaveAttribute('data-image-effect-ready', 'pixelate'),
    );
  },
};
export const Ascii: Story = {
  render: () => html`<hf-image-effect-demo mode="ascii"></hf-image-effect-demo>`,
  play: async ({ canvasElement }) => {
    const image = within(canvasElement).getByRole('img', {
      name: 'Dark square and gray circle on a light background',
    });
    await expect(image).toBeInTheDocument();
    await waitFor(() =>
      expect(image.parentElement).toHaveAttribute('data-image-effect-ready', 'ascii'),
    );
    await expect(image.nextElementSibling).toHaveAttribute('aria-hidden', 'true');
  },
};
