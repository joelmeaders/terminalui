import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { guides } from '../.storybook/docs/catalog';

const stories = readdirSync('stories')
  .filter((file) => file.endsWith('.stories.ts'))
  .map((file) => readFileSync(`stories/${file}`, 'utf8'));
const entries = Object.keys(guides).map((tag) => {
  const source = stories.find((story) => story.includes(`component: '${tag}'`))!;
  const title = /title: '([^']+)'/.exec(source)![1];
  return { tag, id: title.toLowerCase().replaceAll('/', '-').replaceAll(' ', '-') + '--docs' };
});

test('appearance inheritance guide is available in introductions and component styling at narrow widths', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const id of ['introduction-appearance--docs', 'components-button--docs']) {
    await page.goto(`/storybook/iframe.html?id=${id}&viewMode=docs`);
    let guide;
    if (id.startsWith('introduction')) {
      await page.getByRole('link', { name: 'Inheritance', exact: true }).click();
      guide = page.locator('#appearance-guide');
    } else {
      await page.getByText('Cascading appearance settings', { exact: true }).click();
      guide = page.locator('#styling details');
      await expect(guide).toHaveAttribute('open', '');
    }
    await expect(guide).toContainText('html');
    await expect(guide).toContainText('body');
    await expect(guide).toContainText('data-scanlines');
    await expect(guide).toContainText('--t-screen-background');
    await expect(guide).toContainText('shadow roots');
    await expect(guide).toContainText('[attr.data-theme]');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    const report = await new AxeBuilder({ page }).include('.tk-docs').analyze();
    await writeFile(
      testInfo.outputPath(`${id}-appearance-axe-review.json`),
      JSON.stringify({ violations: report.violations, incomplete: report.incomplete }, null, 2),
    );
    expect(report.violations).toEqual([]);
  }
});

test('typography docs share the framework selector and include complete native CSS examples', async ({
  page,
}) => {
  await page.goto('/storybook/?path=/docs/introduction-typography--docs&globals=theme:paper');
  const frame = page.frameLocator('#storybook-preview-iframe');
  const select = frame.getByRole('combobox', { name: 'Documentation framework' });
  for (const [value, snippet] of [
    ['html', '/assets/typography.css'],
    ['react', 'className="example t-prose"'],
    ['angular', '@Component'],
    ['vue', '<script setup lang="ts">'],
  ]) {
    await select.selectOption(value);
    await expect(frame.locator('.tk-docs')).toHaveAttribute('data-docs-framework', value);
    await expect(frame.getByTestId('typography-example')).toContainText(snippet);
    await expect(frame.getByTestId('typography-example')).toContainText('typography.css');
  }
  await expect(frame.locator('#typography-guide')).toContainText('--t-heading-1');
  await expect(frame.locator('#typography-guide')).toContainText('heading levels');
  await expect(frame.locator('#typography-guide')).toContainText('t-link');
  await frame.getByRole('link', { name: 'Try it', exact: true }).click();
  await expect(frame.locator('#live-preview h1')).toHaveCSS('font-size', '48px');
  const nativeLink = frame
    .locator('#live-preview')
    .getByRole('link', { name: 'links for navigation' });
  await nativeLink.focus();
  await page.keyboard.press('Shift');
  await expect(nativeLink).toBeFocused();
  await expect(nativeLink).toHaveCSS('outline-color', 'rgb(48, 79, 148)');
  await page.getByRole('button', { name: 'Button', exact: true }).click();
  await page.locator('a#components-button--docs').click();
  await expect(frame.locator('.tk-docs-tag')).toHaveText('<t-button>');
  await expect(select).toHaveValue('vue');
});

test('typography documentation stays usable at 320 CSS pixels', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/storybook/iframe.html?id=introduction-typography--docs&viewMode=docs');
  await expect(page.getByRole('combobox', { name: 'Documentation framework' })).toBeVisible();
  await page.getByRole('link', { name: 'Styles and tokens', exact: true }).click();
  await expect(page.locator('#typography-guide h2').first()).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await expect(page.locator('.tk-docs-controls-hint')).toBeVisible();
  const typographyControls = page.getByRole('region', { name: 'Typography controls' });
  await typographyControls.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => typographyControls.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  const report = await new AxeBuilder({ page }).include('.tk-docs').analyze();
  await writeFile(
    testInfo.outputPath('typography-documentation-axe-review.json'),
    JSON.stringify({ violations: report.violations, incomplete: report.incomplete }, null, 2),
  );
  expect(report.violations).toEqual([]);
});

for (const { tag, id } of entries) {
  test(`${tag} has a complete built documentation page`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/storybook/iframe.html?id=${id}&viewMode=docs`);
    const article = page.locator('.tk-docs');
    await expect(article).toHaveAttribute('data-docs-framework', 'html');
    await expect(
      article.getByRole('heading', { name: 'API reference', exact: true }),
    ).toBeVisible();
    await expect(article.locator('.tk-docs-lead')).toHaveText(guides[tag].purpose);
    await expect(article.getByTestId('framework-example')).toContainText('/assets/terminal.js');
    await expect(article.locator('#styling')).toContainText('CSS');
    await expect(article.locator('#accessibility')).toContainText(guides[tag].accessibility[0]);
    await expect(article.locator('#states')).toContainText('States and examples');
    await expect(article.locator('h1,h2,h3,h4').filter({ hasText: /^$/ })).toHaveCount(0);
    await expect(article.locator('#live-preview')).not.toContainText('unsubscribe');
    expect(errors).toEqual([]);
  });
}

test('global framework selection changes code and survives navigation and reload', async ({
  page,
}) => {
  await page.goto('/storybook/?path=/docs/components-input--docs');
  const frame = page.frameLocator('#storybook-preview-iframe');
  const select = frame.getByRole('combobox', { name: 'Documentation framework' });
  for (const [value, snippet] of [
    ['react', 'useState'],
    ['vue', 'useTerminalModel'],
    ['angular', 'TerminalValueAccessor'],
    ['html', '/assets/terminal.js'],
  ]) {
    await select.selectOption(value);
    await expect(frame.locator('.tk-docs')).toHaveAttribute('data-docs-framework', value);
    await expect(frame.getByTestId('framework-example')).toContainText(snippet);
    await expect(frame.getByTestId('framework-example')).toContainText('slot="start"');
    if (value !== 'html') await expect(page).toHaveURL(new RegExp(`globals=.*framework:${value}`));
    else await expect(page).not.toHaveURL(/framework:/);
  }
  await select.selectOption('react');
  await page.getByRole('button', { name: 'Icon', exact: true }).click();
  await page.locator('a#components-icon--docs').click();
  await expect(frame.locator('.tk-docs-tag')).toHaveText('<t-icon>');
  await expect(select).toHaveValue('react');
  await expect(frame.getByTestId('framework-example')).toContainText('@terminal-kit/core/react');
  await page.reload();
  await expect(select).toHaveValue('react');
  await page
    .getByRole('button', {
      name: 'Framework used by documentation examples (the preview uses the shared Web Component) React',
      exact: true,
    })
    .click();
  await page.getByRole('option', { name: 'Vue', exact: true }).click();
  await expect(select).toHaveValue('vue');
  await expect(frame.getByTestId('framework-example')).toContainText('<script setup lang="ts">');
  for (const [name, id] of [
    ['API', 'api-reference'],
    ['Styling', 'styling'],
    ['Accessibility', 'accessibility'],
    ['States', 'states'],
    ['Try it', 'live-preview'],
    ['Get started', 'getting-started'],
  ]) {
    await frame.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(/\/storybook\/\?path=\/docs\/components-icon--docs/);
    await expect(frame.locator(`#${id} h2`).first()).toBeInViewport();
  }
});

test('slot API tables and the shared composition guide work in built documentation', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const [id, slots] of [
    ['components-input--docs', ['start', 'end']],
    ['components-button--docs', ['start', 'end']],
    ['components-toast--docs', ['icon', 'actions']],
  ] as const) {
    await page.goto(`/storybook/iframe.html?id=${id}&viewMode=docs`);
    const table = page.getByRole('region', { name: 'Slots', exact: true });
    for (const slot of slots)
      await expect(table.getByRole('cell', { name: slot, exact: true })).toBeVisible();
    await page.getByText('Composing with slots and icons', { exact: true }).click();
    const guide = page
      .locator('details')
      .filter({ has: page.getByText('Composing with slots and icons', { exact: true }) });
    await expect(guide).toHaveAttribute('open', '');
    await expect(guide).toContainText('@terminal-kit/core/components/icon');
    await expect(guide).toContainText('slot="start"');
    await expect(guide).toContainText('read-only');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    const report = await new AxeBuilder({ page }).include('.tk-docs').analyze();
    await writeFile(
      testInfo.outputPath(`${id}-slots-axe-review.json`),
      JSON.stringify({ violations: report.violations, incomplete: report.incomplete }, null, 2),
    );
    expect(report.violations).toEqual([]);
  }
});

test('both icon docs include complete registration and import instructions', async ({ page }) => {
  for (const id of ['components-icon--docs', 'components-icon-button--docs']) {
    await page.goto(`/storybook/iframe.html?id=${id}&viewMode=docs`);
    const guide = page.locator('#icon-registration');
    await expect(
      guide.getByRole('heading', { name: 'Register and import icons', exact: true }),
    ).toBeVisible();
    for (const text of [
      'registerIcon',
      'registerIconSet',
      'ionicons/icons',
      'registerFontAwesomeIcon',
      'registerLucideIcon',
      '@terminal-kit/core/icons',
    ]) {
      await expect(guide).toContainText(text);
    }
    await guide
      .getByText('Built-in icon names · no provider registration needed', { exact: true })
      .click();
    await expect(guide.locator('.tk-docs-icon-names')).toContainText('search');
    await expect(page.locator('.tk-docs-controls')).not.toContainText(/css shadow parts/i);
    await expect(page.getByRole('region', { name: 'CSS parts', exact: true })).toContainText(
      id.includes('button') ? 'button' : 'svg',
    );
  }
});

for (const id of ['components-icon--docs', 'components-input--docs', 'components-dialog--docs']) {
  test(`${id} documentation accessibility and narrow reflow`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(`/storybook/iframe.html?id=${id}&viewMode=docs`);
    const select = page.getByRole('combobox', { name: 'Documentation framework' });
    await expect(select).toBeVisible();
    await select.focus();
    await expect(select).toBeFocused();
    await select.press('ArrowDown');
    await select.press('Enter');
    await expect(select).toHaveValue('angular');
    await page.getByText('Project setup for Angular', { exact: true }).click();
    await expect(page.locator('#getting-started .tk-docs-setup')).toHaveAttribute('open', '');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    const controls = page.getByRole('region', { name: 'Live preview controls' });
    await expect(page.locator('.tk-docs-controls-hint')).toBeVisible();
    const tableWidth = await controls
      .locator('table')
      .first()
      .evaluate((table) => table.getBoundingClientRect().width);
    expect(tableWidth).toBeGreaterThanOrEqual(680);
    const category = controls.locator('tr[title] td:first-child > span').first();
    expect((await category.boundingBox())!.height).toBeLessThanOrEqual(24);
    await controls.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => controls.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await controls.evaluate((element) => {
      element.scrollLeft = 0;
    });
    const report = await new AxeBuilder({ page }).include('.tk-docs').analyze();
    const reportPath = testInfo.outputPath('documentation-axe-review.json');
    await writeFile(
      reportPath,
      JSON.stringify({ violations: report.violations, incomplete: report.incomplete }, null, 2),
    );
    await testInfo.attach('documentation-axe-review', {
      path: reportPath,
      contentType: 'application/json',
    });
    expect(report.violations).toEqual([]);
  });
}
