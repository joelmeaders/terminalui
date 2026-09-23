import { test, expect } from '@playwright/test';
for (const framework of ['plain', 'react', 'vue', 'angular']) {
  test(`${framework}: built package property and event integration`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/examples/${framework}.html`);
    await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Initial');
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Crew');
    await expect(page.locator('output')).toHaveText('Crew');
    await page.getByRole('button', { name: 'Update from app', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Updated');
    await expect(page.locator('output')).toHaveText('Updated');
    if (framework === 'plain') {
      await page.getByRole('textbox', { name: 'Name', exact: true }).press('Enter');
      await expect(page.locator('output')).toHaveText('Saved: Updated');
    }
    expect(errors).toEqual([]);
  });
}
