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

for (const framework of ['react', 'vue', 'angular']) {
  test(`${framework}: optional adapter supports checked, disabled, and model reset`, async ({
    page,
  }) => {
    await page.goto(`/examples/${framework}.html`);
    const name = page.getByRole('textbox', { name: 'Name', exact: true });
    await name.fill('Edited');
    await page.getByRole('checkbox', { name: 'Subscribe', exact: true }).check();
    await expect(page.getByTestId('checked')).toHaveText('true');
    await page.getByRole('button', { name: 'Toggle disabled', exact: true }).click();
    await expect(name).toBeDisabled();
    await page.getByRole('button', { name: 'Toggle disabled', exact: true }).click();
    await expect(name).toBeEnabled();
    if (framework === 'angular') await expect(page.getByTestId('touched')).toHaveText('true');
    await page.getByRole('button', { name: 'Reset from app', exact: true }).click();
    await expect(name).toHaveValue('Initial');
    await expect(page.getByRole('checkbox', { name: 'Subscribe', exact: true })).not.toBeChecked();
    await expect(page.getByTestId('checked')).toHaveText('false');
    if (framework === 'angular') await expect(page.getByTestId('touched')).toHaveText('false');
  });
}
