import { expect, test } from '@playwright/test';
import type { TNumberInput } from '../src/components/number-input';

for (const eventName of ['input', 'change'])
  for (const direction of ['increase', 'decrease'])
    test(`number ${direction} preserves the ${eventName} handler focus move at its bound`, async ({
      page,
    }) => {
      await page.route('**/@vite/client', (route) => route.abort());
      await page.goto('/tests/fixture.html');
      await page.locator('body[data-ready=true]').waitFor();
      await page.locator('#fixture').evaluate((root, eventName) => {
        root.innerHTML =
          '<form><t-number-input label="Quantity" name="quantity" min="0" max="2" value="1"></t-number-input></form><button id="continue">Continue</button>';
        const field = root.querySelector('t-number-input')!;
        field.dataset.events = '[]';
        const events: string[] = [];
        for (const name of ['input', 'change'])
          field.addEventListener(name, () => {
            events.push(name);
            field.dataset.events = JSON.stringify(events);
          });
        field.addEventListener(eventName, () =>
          root.querySelector<HTMLButtonElement>('#continue')!.focus(),
        );
      }, eventName);
      const field = page.locator('t-number-input');
      const action = field.getByRole('button', {
        name: `${direction === 'increase' ? 'Increase' : 'Decrease'} Quantity`,
        exact: true,
      });
      await action.focus();
      await page.keyboard.press('Enter');
      await expect(action).toBeDisabled();
      await field.evaluate(async (element: TNumberInput) => element.updateComplete);
      await expect(page.locator('#continue')).toBeFocused();
      await expect(field).toHaveAttribute('data-events', '["input","change"]');
      expect(
        await page
          .locator('form')
          .evaluate((form) => new FormData(form as HTMLFormElement).get('quantity')),
      ).toBe(direction === 'increase' ? '2' : '0');
    });

test('number boundary recovery preserves a focus move from the disabled action blur handler', async ({
  page,
}) => {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((root) => {
    root.innerHTML =
      '<t-number-input label="Quantity" min="0" max="2" value="1"></t-number-input><button id="continue">Continue</button>';
  });
  const field = page.locator('t-number-input');
  const action = field.getByRole('button', { name: 'Increase Quantity', exact: true });
  await action.evaluate((element) => {
    element.addEventListener('blur', () =>
      element.ownerDocument.querySelector<HTMLButtonElement>('#continue')!.focus(),
    );
  });
  await action.focus();
  await page.keyboard.press('Enter');
  await expect(action).toBeDisabled();
  await field.evaluate(async (element: TNumberInput) => element.updateComplete);
  await expect(page.locator('#continue')).toBeFocused();
});
