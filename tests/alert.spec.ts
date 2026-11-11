import { expect, test } from '@playwright/test';

test('the enlarged dismiss action fits its text and remains keyboard operable', async ({
  page,
}) => {
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((fixture) => {
    fixture.innerHTML = '<t-alert dismissible>Review the destination before continuing.</t-alert>';
  });
  const dismiss = page.getByRole('button', { name: 'Dismiss notice' });
  await dismiss.evaluate((button) => {
    button.style.fontSize = '36px';
    button.style.fontFamily = 'monospace';
  });
  expect(
    await dismiss.evaluate(
      (button) =>
        button.scrollWidth <= button.clientWidth + 2 &&
        button.scrollHeight <= button.clientHeight + 2,
    ),
  ).toBe(true);
  await dismiss.focus();
  await expect(dismiss).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveCount(0);
});
