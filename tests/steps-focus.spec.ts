import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectAxeReport } from './helpers/axe-evidence';
import type { TSteps } from '../src/components/steps';

async function mount(page: Page) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((fixture) => {
    fixture.innerHTML =
      '<button id="before">Before</button><t-steps label="Request stages" value="review"></t-steps><button id="after">After</button>';
    const steps = fixture.querySelector<TSteps>('t-steps')!;
    steps.items = [
      { id: 'details', label: 'Details' },
      { id: 'review', label: 'Review' },
      { id: 'confirm', label: 'Confirm' },
    ];
  });
  await expect(page.locator('t-steps [part=step]')).toHaveCount(3);
}

test('steps keep action identity and focus through inserted and reordered steps', async ({
  page,
}) => {
  await mount(page);
  const review = page.locator('t-steps [data-step-id=review]');
  await review.focus();
  await page.locator('t-steps').evaluate(async (steps: TSteps) => {
    const original = steps.shadowRoot!.querySelector('[data-step-id=review]');
    steps.items = [
      { id: 'new', label: 'New step' },
      steps.items[2],
      steps.items[0],
      steps.items[1],
    ];
    await steps.updateComplete;
    steps.dataset.identity = String(
      original === steps.shadowRoot!.querySelector('[data-step-id=review]'),
    );
  });
  await expect(review).toBeFocused();
  await expect(page.locator('t-steps')).toHaveAttribute('data-identity', 'true');
  await expect(review).toHaveAttribute('aria-current', 'step');
});

test('steps recover to an enabled action or a visible empty region after live changes', async ({
  page,
}) => {
  await mount(page);
  await page.locator('t-steps [data-step-id=review]').focus();
  await page.locator('t-steps').evaluate((steps: TSteps) => {
    steps.items = steps.items.filter((step) => step.id !== 'review');
  });
  await expect(page.locator('t-steps [data-step-id=confirm]')).toBeFocused();
  await page.locator('t-steps').evaluate((steps: TSteps) => {
    steps.items = steps.items.map((step) => ({ ...step, disabled: true }));
  });
  const region = page.getByRole('navigation', { name: 'Request stages' });
  await expect(region).toBeFocused();
  await page.locator('t-steps').evaluate((steps: TSteps) => {
    steps.items = [];
  });
  await expect(region).toBeFocused();
  await expect(region.getByRole('status')).toHaveText('No steps available.');
  await page.locator('t-steps').evaluate((steps: TSteps) => {
    steps.items = [{ id: 'retry', label: 'Retry' }];
  });
  await expect(page.locator('t-steps [data-step-id=retry]')).toBeFocused();
});

test('steps preserve outside focus during updates and application selection handlers', async ({
  page,
}) => {
  await mount(page);
  await page.locator('#after').focus();
  await page.locator('t-steps').evaluate((steps: TSteps) => {
    steps.items = [...steps.items].reverse();
  });
  await expect(page.locator('#after')).toBeFocused();
  await page.locator('t-steps').evaluate((steps: TSteps) => {
    steps.addEventListener('t-select', () =>
      steps.ownerDocument.querySelector<HTMLButtonElement>('#after')!.focus(),
    );
  });
  await page.locator('t-steps [data-step-id=details]').click();
  await expect(page.locator('#after')).toBeFocused();
  await expect(page.locator('t-steps [data-step-id=details]')).toHaveAttribute(
    'aria-current',
    'step',
  );
});

test('the focused empty steps region remains visible at 320 CSS pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 600 });
  await mount(page);
  await page.locator('t-steps [data-step-id=review]').focus();
  await page.locator('t-steps').evaluate((steps: TSteps) => {
    steps.items = [];
  });
  const region = page.getByRole('navigation', { name: 'Request stages' });
  await expect(region).toBeFocused();
  await expect(region.getByRole('status')).toBeVisible();
  const box = (await region.boundingBox())!;
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  await expectAxeReport(
    await new AxeBuilder({ page }).include('t-steps').analyze(),
    'steps-empty-focus',
  );
});
