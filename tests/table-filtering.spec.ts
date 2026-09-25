import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role' },
  { key: 'score', label: 'Score', sortable: true },
];
const rows = [
  { id: 'a', name: 'Ada', role: 'Engineer', score: 9 },
  { id: 'b', name: 'Bob', role: 'Operator', score: 3 },
  { id: 'c', name: 'Cora', role: 'Engineer', score: 6 },
  { id: 'd', name: 'Dan', role: 'Operator', score: 1 },
  { id: 'e', name: 'Ellen', role: 'Engineer', score: 8 },
];

async function fixture(page: Page, markup: string) {
  await page.route('**/@vite/client', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' }),
  );
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((element, html) => {
    element.innerHTML = html;
  }, markup);
  await page.locator('t-table').evaluate(
    (element: any, data) => {
      element.columns = data.columns;
      element.rows = data.rows;
      element.events = [];
      for (const name of ['t-filter', 't-sort', 't-page-change', 't-selection-change'])
        element.addEventListener(name, (event: CustomEvent) => {
          element.events.push({ name, detail: event.detail });
        });
    },
    { columns, rows },
  );
}

test('filter, sort, page, and select only visible rows while retaining hidden selections', async ({
  page,
}) => {
  await fixture(
    page,
    '<t-table caption="Crew roster" filterable selectable page-size="2"></t-table>',
  );
  const table = page.locator('t-table');
  const search = page.getByRole('searchbox', { name: 'Filter Crew roster' });
  await expect(page.getByRole('table', { name: 'Crew roster' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Crew roster pages' })).toBeVisible();
  await expect(table.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('checkbox', { name: 'Select row a' }).check();
  await page.getByRole('button', { name: 'Next page for Crew roster' }).click();
  await expect(table.locator('tbody')).toContainText('Cora');
  await expect(table.locator('.pagination .status')).toHaveText('Page 2 of 3');
  await expect(table.locator('.visually-hidden[role=status]')).toHaveText('Page 2 of 3.');
  await page.getByRole('checkbox', { name: 'Select all visible rows' }).check();
  expect(await table.evaluate((element: any) => element.selectedKeys)).toEqual(['a', 'c', 'd']);
  await search.fill('engineer');
  await expect(search).toBeFocused();
  await expect(table.locator('.count')).toHaveText('3 of 5 records');
  await expect(table.locator('tbody tr')).toHaveCount(2);
  await expect(table.locator('tbody')).toContainText('Ada');
  await expect(table.locator('tbody')).toContainText('Cora');
  await expect(table.locator('.pagination .status')).toHaveText('Page 1 of 2');
  await expect(table.locator('.visually-hidden[role=status]')).toHaveText('3 matching records.');
  await expect(page.getByRole('checkbox', { name: 'Select all visible rows' })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Select all visible rows' }).uncheck();
  expect(await table.evaluate((element: any) => element.selectedKeys)).toEqual(['d']);
  await page.getByRole('button', { name: 'Sort by Score' }).click();
  await expect(table.locator('.visually-hidden[role=status]')).toHaveText(
    'Sorted by Score, ascending.',
  );
  await expect(table.locator('tbody tr').first()).toContainText('Cora');
  await expect(table.locator('[aria-sort=ascending]')).toContainText('Score');
  await page.getByRole('button', { name: 'Next page for Crew roster' }).click();
  await expect(table.locator('tbody')).toContainText('Ada');
  await expect(page.getByRole('checkbox', { name: 'Select row d' })).toHaveCount(0);
  await search.fill('missing');
  await expect(table.locator('tbody [role=status]')).toHaveText('No matching records.');
  await expect(page.getByRole('checkbox', { name: 'Select all visible rows' })).toBeDisabled();
  expect(await table.evaluate((element: any) => element.selectedKeys)).toEqual(['d']);
  const events = await table.evaluate((element: any) => element.events);
  expect(events).toContainEqual({ name: 't-page-change', detail: { page: 2, pageSize: 2 } });
  expect(events).toContainEqual({
    name: 't-sort',
    detail: { key: 'score', direction: 'ascending' },
  });
  expect(events).toContainEqual({
    name: 't-selection-change',
    detail: { selectedKeys: ['a', 'c', 'd'] },
  });
  expect(events.at(-1)).toEqual({ name: 't-filter', detail: { query: 'missing' } });
});

test('programmatic query and paging clamp without emitting user events', async ({ page }) => {
  await fixture(page, '<t-table caption="Crew roster" page-size="2"></t-table>');
  const table = page.locator('t-table');
  await table.evaluate((element: any) => {
    element.page = 99;
  });
  await expect(table.locator('.pagination .status')).toHaveText('Page 3 of 3');
  await expect(table.locator('tbody')).toContainText('Ellen');
  await table.evaluate((element: any) => {
    element.query = 'operator';
  });
  await expect(table.locator('.pagination .status')).toHaveText('Page 1 of 1');
  await expect(table.locator('tbody')).toContainText('Bob');
  await expect(table.locator('tbody')).toContainText('Dan');
  expect(await table.evaluate((element: any) => element.events)).toEqual([]);
  await table.evaluate((element: any) => {
    element.query = '';
    element.pageSize = 0;
  });
  await expect(table.locator('tbody tr')).toHaveCount(5);
  await expect(page.getByRole('navigation', { name: 'Crew roster pages' })).toHaveCount(0);
});

test('filtering keeps loading, empty, and replacement states distinct', async ({ page }) => {
  await fixture(page, '<t-table caption="Crew roster" filterable page-size="2"></t-table>');
  const table = page.locator('t-table');
  await table.evaluate((element: any) => {
    element.loading = true;
  });
  await expect(page.getByRole('searchbox', { name: 'Filter Crew roster' })).toBeDisabled();
  await expect(table.locator('tbody [role=status]')).toHaveText('Loading…');
  await expect(page.getByRole('button', { name: 'Next page for Crew roster' })).toBeDisabled();
  await table.evaluate((element: any) => {
    element.loading = false;
    element.rows = [];
  });
  await expect(table.locator('tbody [role=status]')).toHaveText('No records.');
  await table.evaluate((element: any) => {
    element.rows = [{ id: 'new', name: 'New', role: 'Pilot', score: 7 }];
    element.query = 'missing';
    element.noResultsText = 'No crew matched the filter.';
  });
  await expect(table.locator('tbody [role=status]')).toHaveText('No crew matched the filter.');
  await table.evaluate((element: any) => {
    element.query = 'pilot';
  });
  await expect(table.locator('tbody')).toContainText('New');
  await page.getByRole('searchbox', { name: 'Filter Crew roster' }).fill('new');
  await expect(table.locator('.visually-hidden[role=status]')).toHaveText('1 matching record.');
});

function rgb(value: string) {
  return value
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map(Number);
}
function luminance(values: number[]) {
  return values
    .map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}
function ratio(left: string, right: string) {
  const values = [luminance(rgb(left)), luminance(rgb(right))].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('filter and pager retain contrast, names, and axe results in all palettes', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await fixture(
    page,
    '<t-table caption="Crew roster" filterable selectable page-size="2"></t-table>',
  );
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((element, value) => element.setAttribute('data-theme', value), theme);
    const colors = await page.locator('t-table input[type=search]').evaluate((input) => {
      const style = getComputedStyle(input);
      return {
        border: style.borderTopColor,
        text: style.color,
        background: style.backgroundColor,
      };
    });
    expect(
      ratio(colors.border, colors.background),
      `${theme}: filter boundary`,
    ).toBeGreaterThanOrEqual(3);
    expect(ratio(colors.text, colors.background), `${theme}: filter text`).toBeGreaterThanOrEqual(
      4.5,
    );
    const result = await new AxeBuilder({ page }).include('t-table').analyze();
    expect(result.violations, `${theme}: ${JSON.stringify(result.violations)}`).toEqual([]);
    if (result.incomplete.length)
      await testInfo.attach(`${theme}-table-axe-review`, {
        body: JSON.stringify(result.incomplete, null, 2),
        contentType: 'application/json',
      });
  }
});

test('table controls reflow at 320 CSS pixels with enlarged and spaced text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await fixture(page, '<t-table caption="Long mission roster" filterable page-size="2"></t-table>');
  await page.locator('t-table').evaluate((element: any) => {
    element.columns = [
      { key: 'name', label: 'A very long crew member name', sortable: true },
      { key: 'role', label: 'Role with a long description' },
    ];
    element.rows = [
      { id: 1, name: 'A long crew member name', role: 'Engineer' },
      { id: 2, name: 'Another long crew member name', role: 'Pilot' },
      { id: 3, name: 'A third long crew member name', role: 'Navigator' },
    ];
  });
  await page.locator('t-table').evaluate((element: HTMLElement) => {
    for (const node of element.shadowRoot!.querySelectorAll<HTMLElement>(
      '.tools label,.count,caption,th,td,.pagination button,.pagination .status',
    )) {
      const size = Number.parseFloat(getComputedStyle(node).fontSize);
      node.style.fontSize = `${size * 2}px`;
      node.style.lineHeight = '1.5';
      node.style.letterSpacing = '.12em';
      node.style.wordSpacing = '.16em';
    }
  });
  await expect(page.getByRole('searchbox', { name: 'Filter Long mission roster' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Next page for Long mission roster' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const container = page.locator('t-table [part=container]');
  expect(await container.evaluate((element) => element.scrollWidth)).toBeGreaterThan(
    await container.evaluate((element) => element.clientWidth),
  );
  await page.getByRole('button', { name: 'Next page for Long mission roster' }).click();
  await expect(page.locator('t-table .pagination .status')).toHaveText('Page 2 of 2');
});

test('forced colors retain filter and pager boundaries and keyboard focus', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors.');
  await page.emulateMedia({ forcedColors: 'active' });
  await fixture(page, '<t-table caption="Crew roster" filterable page-size="2"></t-table>');
  await page.getByRole('searchbox', { name: 'Filter Crew roster' }).focus();
  await expect(page.getByRole('searchbox', { name: 'Filter Crew roster' })).toHaveCSS(
    'outline-style',
    'solid',
  );
  await expect(page.getByRole('button', { name: 'Next page for Crew roster' })).toHaveCSS(
    'border-top-style',
    'solid',
  );
});
