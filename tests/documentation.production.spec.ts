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
    await expect(page.locator('.tk-docs-setup')).toHaveAttribute('open', '');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
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
