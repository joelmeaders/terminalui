import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import '../src/components/breadcrumb';
const meta = {
  title: 'Navigation/Breadcrumb',
  component: 't-breadcrumb',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Native navigation links. Set `items` to `{ label, href?, current? }[]`. The last item is current unless another item sets `current`. Set `label` when multiple breadcrumb landmarks appear on a page. Links accept ordinary web navigation URLs. Data labels render as text.',
      },
    },
  },
  render: () =>
    html`<t-breadcrumb
      .items=${[{ label: 'Home', href: '#home' }, { label: 'Projects', href: '#projects' }, { label: 'Hullframe' }]}
    ></t-breadcrumb>`,
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Default: Story = {};
export const LongPath: Story = {
  render: () =>
    html`<div style="max-width:360px">
      <t-breadcrumb
        .items=${[{ label: 'Organization', href: '#organization' }, { label: 'Engineering', href: '#engineering' }, { label: 'Design systems', href: '#systems' }, { label: 'Component library documentation' }]}
      ></t-breadcrumb>
    </div>`,
};
export const Filenames: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Complete archive and report names wrap at narrow widths. Links keep native keyboard activation and URLs. The current page remains visible text.',
      },
    },
  },
  render: () =>
    html`<div style="max-width:320px">
      <t-breadcrumb
        label="Archive location"
        data-density="compact"
        .items=${[
          { label: 'Home', href: '#home' },
          { label: 'telemetry_archive_2026_09_26_observation_reports.json', href: '#archive' },
          { label: 'observation_report_2026_09_26_orbital_telemetry.json' },
        ]}
      ></t-breadcrumb>
    </div>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('t-breadcrumb')!;
    const link = host.shadowRoot!.querySelector<HTMLAnchorElement>('a[href="#archive"]')!;
    link.focus();
    await expect(host.shadowRoot!.activeElement).toBe(link);
    let activated = false;
    // Keep the test frame in place. Playwright verifies native URL navigation.
    link.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        activated = true;
      },
      { once: true },
    );
    await userEvent.keyboard('{Enter}');
    await expect(activated).toBe(true);
    await expect(link).toHaveAttribute('href', '#archive');
    await expect(host.shadowRoot!.querySelector('[aria-current=page]')).toHaveTextContent(
      'observation_report_2026_09_26_orbital_telemetry.json',
    );
    for (const label of host.shadowRoot!.querySelectorAll('li > a,li > span:not(.separator)')) {
      const box = label.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(label);
      await expect(
        [...range.getClientRects()].every(
          (rect) => rect.left >= box.left - 1 && rect.right <= box.right + 1,
        ),
      ).toBe(true);
    }
  },
};
export const ShortNames: Story = {
  render: () =>
    html`<t-breadcrumb
      label="Drive location"
      data-density="compact"
      .items=${[
        { label: 'I', href: '#drive-i' },
        { label: 'R', href: '#drive-r' },
        { label: 'Reports' },
      ]}
    ></t-breadcrumb>`,
  play: async ({ canvasElement }) => {
    for (const link of canvasElement
      .querySelector('t-breadcrumb')!
      .shadowRoot!.querySelectorAll('a')) {
      const box = link.getBoundingClientRect();
      await expect(box.width).toBeGreaterThanOrEqual(24);
      await expect(box.height).toBeGreaterThanOrEqual(24);
    }
  },
};
