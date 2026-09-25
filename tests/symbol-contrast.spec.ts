import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

type RGB = [number, number, number];
function luminance(color: RGB) {
  return color
    .map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    })
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
}
function contrast(a: RGB, b: RGB) {
  const [bright, dark] = [luminance(a), luminance(b)].sort((left, right) => right - left);
  return (bright + 0.05) / (dark + 0.05);
}

test('axe-incomplete symbols retain rendered contrast in every palette', async ({
  page,
}, testInfo) => {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((element) => {
    element.innerHTML = `<t-number-input label="Crew size" value="4" min="1" max="8"></t-number-input>
      <t-date-picker label="Launch date" value="2026-09-25"></t-date-picker>
      <t-date-range-picker label="Mission window" value="2026-09-25/2026-10-01"></t-date-range-picker>
      <t-time-picker label="Launch time" value="09:30"></t-time-picker>
      <t-alert variant="info">Information</t-alert>
      <t-alert variant="success">Saved</t-alert>
      <t-alert variant="warning">Check this</t-alert>
      <t-alert variant="danger">Stop</t-alert>
      <t-steps label="Mission steps"></t-steps>
      <t-menu label="Actions"></t-menu>
      <t-tree label="Files"></t-tree>
      <t-calendar label="Mission date" value="2026-09-25" month="2026-09"></t-calendar>
      <t-table caption="Mission records"></t-table>
      <button class="t-native" type="button">Native action</button>`;
    (element.querySelector('t-steps') as import('../src').TSteps).items = [
      { id: 'configure', label: 'Configure', status: 'complete' },
      { id: 'review', label: 'Review', status: 'pending' },
    ];
    (element.querySelector('t-tree') as import('../src').TTree).items = [
      { id: 'project', label: 'Mission archive', children: [{ id: 'report', label: 'Report' }] },
    ];
    (element.querySelector('t-table') as import('../src').TTable).columns = [
      { key: 'name', label: 'Document' },
      { key: 'status', label: 'Status' },
    ];
    (element.querySelector('t-table') as import('../src').TTable).rows = [
      { id: '01', name: 'Survey', status: 'Complete' },
    ];
  });
  await expect(page.locator('t-table td').first()).toBeVisible();

  const targets = [
    {
      name: 'number decrease',
      host: 't-number-input',
      selector: 'button[part=decrease]',
      minimum: 3,
    },
    {
      name: 'date trigger',
      host: 't-date-picker',
      selector: '.trigger span[aria-hidden=true]',
      minimum: 3,
    },
    {
      name: 'date range trigger',
      host: 't-date-range-picker',
      selector: '.trigger span[aria-hidden=true]',
      minimum: 3,
    },
    {
      name: 'time trigger',
      host: 't-time-picker',
      selector: '.trigger span[aria-hidden=true]',
      minimum: 3,
    },
    ...(['info', 'success', 'warning', 'danger'] as const).map((variant) => ({
      name: `${variant} notice symbol`,
      host: `t-alert[variant=${variant}]`,
      selector: '.symbol',
      minimum: 3,
    })),
    { name: 'step number', host: 't-steps', selector: '.number', minimum: 3 },
    { name: 'menu arrow', host: 't-menu', selector: '.trigger span[aria-hidden=true]', minimum: 3 },
    { name: 'tree toggle', host: 't-tree', selector: '.toggle', minimum: 3 },
    { name: 'previous month', host: 't-calendar', selector: 'button[part=previous]', minimum: 3 },
    { name: 'next month', host: 't-calendar', selector: 'button[part=next]', minimum: 3 },
    { name: 'weekday heading', host: 't-calendar', selector: 'th[abbr]', minimum: 4.5 },
    { name: 'table text', host: 't-table', selector: 'td', minimum: 4.5 },
    { name: 'native control text', host: 'button.t-native', selector: ':scope', minimum: 4.5 },
  ];
  const evidence: {
    theme: string;
    phase: string;
    name: string;
    foreground: RGB;
    background: RGB;
    ratio: number;
    minimum: number;
  }[] = [];
  for (const theme of ['amber', 'paper', 'amber', 'phosphor', 'ice', 'lunar', 'signal']) {
    await page.locator('html').evaluate((element, value) => {
      element.dataset.theme = value;
    }, theme);
    for (const phase of ['immediate', 'first frame', 'settled']) {
      if (phase === 'first frame')
        await page.evaluate(
          () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
        );
      if (phase === 'settled') await page.waitForTimeout(150);
      const rendered = await page.evaluate((targets) => {
        type RGBA = [number, number, number, number];
        const rgba = (value: string): RGBA => {
          const numbers = value.match(/[\d.]+/g)?.map(Number) ?? [];
          return [numbers[0] ?? 0, numbers[1] ?? 0, numbers[2] ?? 0, numbers[3] ?? 1];
        };
        const parent = (element: Element): Element | null =>
          element.parentElement ??
          (element.getRootNode() instanceof ShadowRoot
            ? (element.getRootNode() as ShadowRoot).host
            : null);
        const background = (element: Element): RGB => {
          const layers: RGBA[] = [];
          for (let node: Element | null = element; node; node = parent(node))
            layers.unshift(rgba(getComputedStyle(node).backgroundColor));
          return layers.reduce<RGB>(
            (under, [red, green, blue, alpha]) => [
              red * alpha + under[0] * (1 - alpha),
              green * alpha + under[1] * (1 - alpha),
              blue * alpha + under[2] * (1 - alpha),
            ],
            [255, 255, 255],
          );
        };
        return targets.map((target) => {
          const host = document.querySelector<HTMLElement>(target.host);
          const node =
            target.selector === ':scope'
              ? host
              : host?.shadowRoot?.querySelector<HTMLElement>(target.selector);
          if (!node) throw new Error(`Missing rendered symbol: ${target.name}`);
          const [red, green, blue] = rgba(getComputedStyle(node).color);
          return {
            name: target.name,
            foreground: [red, green, blue] as RGB,
            background: background(node),
          };
        });
      }, targets);
      for (const item of rendered) {
        const minimum = targets.find((target) => target.name === item.name)!.minimum;
        evidence.push({
          theme,
          phase,
          ...item,
          ratio: contrast(item.foreground, item.background),
          minimum,
        });
      }
    }
  }
  const evidencePath = testInfo.outputPath('symbol-contrast-pairs.json');
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
  await testInfo.attach('symbol-contrast-pairs', {
    path: evidencePath,
    contentType: 'application/json',
  });
  expect(evidence.filter((item) => item.ratio < item.minimum)).toEqual([]);
});
