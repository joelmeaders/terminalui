import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  // Vite's JSX development runtime imports its client module. Keep it available.
  await page.goto('/tests/react-events.html');
  await expect(page.getByRole('heading', { name: 'React event delivery' })).toBeVisible();
});
test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

async function received(page: Page, name: string, detail: unknown) {
  await expect
    .poll(async () => JSON.parse(await page.locator('#event-log').innerText())[name])
    .toEqual(detail);
}

test('React forwards nested selection and controlled boolean details with keyboard focus', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const trigger = page.getByRole('button', { name: 'File actions', exact: true });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Open report' })).toBeFocused();
  await page.keyboard.press('Enter');
  await received(page, 'menu', { value: 'open', label: 'Open report' });
  await expect(trigger).toBeFocused();
  const chip = page.getByRole('button', { name: 'Archived', exact: true });
  await chip.focus();
  await page.keyboard.press('Space');
  await received(page, 'chip-toggle', { selected: true, label: 'Archived' });
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(chip).toBeFocused();
  await page.getByRole('button', { name: 'Remove Archived' }).click();
  await received(page, 'chip-remove', { label: 'Archived' });
  await expect(chip).toBeVisible();
  const separator = await page.getByRole('separator', { name: 'Navigation' }).boundingBox();
  const opener = await page.getByRole('button', { name: 'Open dialog', exact: true }).boundingBox();
  expect(opener!.y).toBeGreaterThanOrEqual(separator!.y + separator!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const report = await new AxeBuilder({ page }).analyze();
  const reportPath = testInfo.outputPath('react-event-fixture-axe-review.json');
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        browser: page.context().browser()?.version(),
        violations: report.violations,
        incomplete: report.incomplete,
      },
      null,
      2,
    ),
  );
  await testInfo.attach('react-event-fixture-axe-review', {
    path: reportPath,
    contentType: 'application/json',
  });
  expect(report.violations).toEqual([]);
  if (testInfo.project.name === 'chromium')
    await page.screenshot({ path: testInfo.outputPath('react-event-fixture-320.png') });
});

test('React keeps mixed row keys, sort literals, and keyboard resize details', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'Select row 1', exact: true }).check();
  await received(page, 'selection', { selectedKeys: [1] });
  await page.getByRole('checkbox', { name: 'Select row two', exact: true }).check();
  await received(page, 'selection', { selectedKeys: [1, 'two'] });
  await page.getByRole('button', { name: 'Sort by Name', exact: true }).click();
  await received(page, 'sort', { key: 'name', direction: 'ascending' });
  await page.getByRole('button', { name: 'Sort by Name', exact: true }).click();
  await received(page, 'sort', { key: 'name', direction: 'descending' });
  const separator = page.getByRole('separator', { name: 'Navigation', exact: true });
  await separator.focus();
  await page.keyboard.press('ArrowRight');
  const detail = { size: 51, orientation: 'horizontal', source: 'keyboard' };
  await received(page, 'resize-input', detail);
  await received(page, 'resize-change', detail);
  await expect(separator).toBeFocused();
  await expect(separator).toHaveAttribute('aria-valuenow', '51');
});

test('React receives null modal details and all notification dismissal reasons', async ({
  page,
}) => {
  const opener = page.getByRole('button', { name: 'Open dialog', exact: true });
  await opener.click();
  await expect(page.getByRole('dialog', { name: 'Confirm action' })).toBeVisible();
  await page.keyboard.press('Escape');
  await received(page, 'dialog-close', null);
  await expect(opener).toBeFocused();
  const show = page.getByRole('button', { name: 'Show notification', exact: true });
  await show.click();
  await received(page, 'toast-close', 'timeout');
  await show.click();
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  await dismiss.focus();
  await dismiss.press('Enter');
  await received(page, 'toast-close', 'dismiss');
  await expect(show).toBeFocused();
  await show.click();
  await page.getByRole('button', { name: 'Close notification', exact: true }).click();
  await received(page, 'toast-close', 'programmatic');
});
