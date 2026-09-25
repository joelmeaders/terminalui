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
  const [light, dark] = [luminance(a), luminance(b)].sort((left, right) => right - left);
  return (light + 0.05) / (dark + 0.05);
}

test('open tooltip text stays readable across nested palette changes', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('html').evaluate((element) => {
    element.dataset.theme = 'lunar';
  });
  await page.locator('#fixture').evaluate((element) => {
    element.innerHTML = `<section class="t-screen" data-theme="amber" style="padding:16px;background:var(--t-bg);color:var(--t-text)">
      <t-tooltip label="Mission help" message="Review the mission information before you continue."></t-tooltip>
    </section>`;
  });
  await page.getByRole('button', { name: 'Mission help' }).focus();
  await expect(page.getByRole('tooltip')).toBeVisible();

  const evidence: { theme: string; foreground: RGB; background: RGB; ratio: number }[] = [];
  for (const theme of ['amber', 'paper', 'phosphor', 'ice', 'lunar', 'signal']) {
    await page.locator('#fixture section').evaluate((element, value) => {
      (element as HTMLElement).dataset.theme = value;
    }, theme);
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    const colors = await page.locator('t-tooltip').evaluate((host) => {
      const panel = host.shadowRoot!.querySelector<HTMLElement>('#tip')!;
      if (!panel.matches(':popover-open')) throw new Error('Tooltip closed during palette change');
      const parse = (value: string) => value.match(/[\d.]+/g)?.map(Number) ?? [];
      const foreground = parse(getComputedStyle(panel).color);
      const background = parse(getComputedStyle(panel).backgroundColor);
      if ((background[3] ?? 1) !== 1) throw new Error('Tooltip surface must be opaque');
      return {
        foreground: foreground.slice(0, 3) as RGB,
        background: background.slice(0, 3) as RGB,
      };
    });
    evidence.push({ theme, ...colors, ratio: contrast(colors.foreground, colors.background) });
    await expect(page.getByRole('tooltip')).toBeVisible();
    const bounds = (await page.getByRole('tooltip').boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
    if (theme === 'paper' && testInfo.project.name === 'chromium') {
      const screenshotPath = testInfo.outputPath('paper-tooltip-320.png');
      await page.screenshot({ path: screenshotPath });
      await testInfo.attach('paper-tooltip-320', {
        path: screenshotPath,
        contentType: 'image/png',
      });
    }
  }

  const evidencePath = testInfo.outputPath('tooltip-contrast-pairs.json');
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
  await testInfo.attach('tooltip-contrast-pairs', {
    path: evidencePath,
    contentType: 'application/json',
  });
  expect(evidence.filter(({ ratio }) => ratio < 4.5)).toEqual([]);
});
