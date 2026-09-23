import { test, expect } from '@playwright/test';
test('production demo retains component registration and working interactions', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Initialize', exact: false }).click();
  await expect(page.locator('.event-console')).toContainText('Primary action activated.');
  await page.getByRole('button', { name: 'Paper', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
  await page.getByRole('textbox', { name: 'Callsign', exact: false }).fill('PRODUCTION');
  await page.getByRole('combobox').selectOption('application');
  await page.getByRole('textbox', { name: 'Callsign', exact: false }).press('Enter');
  await expect(page.locator('.event-console')).toContainText('PRODUCTION / application');
  expect(errors).toEqual([]);
});
test('built Storybook serves documentation and the real component canvas', async ({ page }) => {
  await page.goto('/storybook/?path=/docs/components-button--docs');
  const frame = page.frameLocator('#storybook-preview-iframe');
  await expect(frame.getByRole('heading', { name: 'Button', exact: true })).toBeVisible();
  await expect(frame.locator('t-button button').first()).toBeVisible();
  await page.goto('/storybook/iframe.html?id=components-input--required&viewMode=story');
  await expect(page.getByRole('textbox')).toBeVisible();
  await page.getByRole('textbox').fill('Built story');
  await expect(page.getByRole('textbox')).toHaveValue('Built story');
});

for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
  test(`visual reference: ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    await page
      .getByRole('button', { name: theme[0].toUpperCase() + theme.slice(1), exact: true })
      .click();
    await expect(page).toHaveScreenshot(`${theme}-desktop.png`, {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.002,
    });
  });
}

test('visual reference: mobile and dialog', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Save configuration', exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('amber-mobile.png', {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.002,
  });
  await page.getByRole('button', { name: 'Open dialog' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveScreenshot('amber-dialog.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.002,
  });
});
