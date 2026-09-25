import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function fixture(page: Page, markup: string) {
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.evaluate(async () => {
    for (const name of ['menu', 'breadcrumb', 'pagination', 'table', 'drawer', 'tree'])
      await import(`/src/components/${name}.ts`);
  });
  await page.locator('#fixture').evaluate((element, html) => {
    element.innerHTML = html;
  }, markup);
}

test('menu skips disabled actions, supports typeahead, returns focus, and dismisses outside', async ({
  page,
}) => {
  await fixture(page, '<t-menu label="Actions"></t-menu><button id="outside">Outside</button>');
  await page.locator('t-menu').evaluate((element: any) => {
    element.options = [
      { value: 'open', label: 'Open' },
      { value: 'disabled', label: 'Unavailable', disabled: true },
      { value: 'line', label: '', separator: true },
      { value: 'save', label: 'Save' },
      { value: 'share', label: 'Share' },
    ];
    element.addEventListener(
      't-select',
      (event: CustomEvent) => (element.dataset.selected = event.detail.value),
    );
  });
  const trigger = page.getByRole('button', { name: 'Actions' });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Open' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Save', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: 'Share' })).toBeFocused();
  await page.keyboard.press('o');
  await expect(page.getByRole('menuitem', { name: 'Open' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('t-menu')).toHaveAttribute('data-selected', 'open');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Outside' })).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await page.getByRole('button', { name: 'Outside' }).click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await page
    .locator('t-menu')
    .evaluate(
      (element: any) =>
        (element.options = [{ value: 'disabled', label: 'Unavailable', disabled: true }]),
    );
  await trigger.click();
  await expect(page.getByRole('menu')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('menu exposes popup state without an unresolved ID reference', async ({ page }) => {
  await fixture(page, '<t-menu label="Actions"></t-menu>');
  await page.locator('t-menu').evaluate((element: import('../src').TMenu) => {
    element.options = [{ value: 'open', label: 'Open' }];
  });
  const trigger = page.getByRole('button', { name: 'Actions' });
  await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(await trigger.getAttribute('aria-controls')).toBeNull();
  const closed = await new AxeBuilder({ page }).include('t-menu').analyze();
  expect(closed.violations).toEqual([]);
  expect(closed.incomplete.filter((result) => result.id === 'aria-valid-attr-value')).toEqual([]);
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(await trigger.getAttribute('aria-controls')).toBeNull();
  await expect(page.locator('t-menu #menu')).toBeVisible();
  const open = await new AxeBuilder({ page }).include('t-menu').analyze();
  expect(open.violations).toEqual([]);
  expect(open.incomplete.filter((result) => result.id === 'aria-valid-attr-value')).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(await trigger.getAttribute('aria-controls')).toBeNull();
});

test('menu escapes clipping and stays inside viewport edges', async ({ page }) => {
  await fixture(
    page,
    '<div style="position:fixed;right:0;bottom:0;width:130px;height:48px;overflow:hidden"><t-menu label="Edge actions"></t-menu></div>',
  );
  await page.locator('t-menu').evaluate(
    (element: any) =>
      (element.options = [
        { value: 'open', label: 'Open the selected project' },
        { value: 'save', label: 'Save a copy of this project' },
      ]),
  );
  await page.getByRole('button', { name: 'Edge actions' }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  await page.getByRole('menuitem', { name: 'Save a copy of this project' }).click();
  await expect(menu).toHaveCount(0);
});

test('breadcrumb marks one current item and renders labels as text', async ({ page }) => {
  await fixture(page, '<t-breadcrumb></t-breadcrumb>');
  await page.locator('t-breadcrumb').evaluate(
    (element: any) =>
      (element.items = [
        { label: 'Home', href: '#home' },
        { label: '<img src=x onerror=alert(1)>', href: 'javascript:alert(1)' },
        { label: 'Settings', current: true },
      ]),
  );
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '#home');
  await expect(page.locator('t-breadcrumb [aria-current=page]')).toHaveCount(1);
  await expect(page.locator('t-breadcrumb img')).toHaveCount(0);
  await expect(page.getByRole('link')).toHaveCount(1);
});

test('pagination bounds values, emits changes, and limits page button count', async ({ page }) => {
  await fixture(page, '<t-pagination total="10000000" page="-3"></t-pagination>');
  await page
    .locator('t-pagination')
    .evaluate((element: any) =>
      element.addEventListener(
        't-change',
        (event: CustomEvent) => (element.dataset.changed = JSON.stringify(event.detail)),
      ),
    );
  await expect(page.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  await expect(page.getByRole('button')).toHaveCount(5);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.locator('t-pagination')).toHaveAttribute(
    'data-changed',
    '{"page":2,"pageSize":10}',
  );
  await page.getByRole('button', { name: 'Page 1000000', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
  await page.locator('t-pagination').evaluate((element: any) => {
    element.total = 0;
    element.pageSize = 0;
  });
  await expect(page.getByRole('status')).toHaveText('Page 1 of 1');
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
});

test('table sorts numbers and keeps selection associated with stable identifiers', async ({
  page,
}) => {
  await fixture(page, '<t-table caption="Members" selectable></t-table>');
  await page.locator('t-table').evaluate((element: any) => {
    element.columns = [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'count', label: 'Count', sortable: true },
    ];
    element.rows = [
      { id: 'a', name: '<b>Ada</b>', count: 12 },
      { id: 'b', name: 'Grace', count: 2 },
    ];
    element.addEventListener(
      't-sort',
      (event: CustomEvent) => (element.dataset.sort = JSON.stringify(event.detail)),
    );
    element.addEventListener(
      't-selection-change',
      (event: CustomEvent) => (element.dataset.selection = JSON.stringify(event.detail)),
    );
  });
  await page.getByRole('checkbox', { name: 'Select row a', exact: true }).check();
  await page.getByRole('button', { name: 'Sort by Count' }).click();
  await expect(page.locator('t-table tbody tr').first()).toContainText('Grace');
  await expect(page.getByRole('checkbox', { name: 'Select row a', exact: true })).toBeChecked();
  await expect(page.locator('t-table')).toHaveAttribute(
    'data-sort',
    '{"key":"count","direction":"ascending"}',
  );
  await expect(page.locator('t-table [aria-sort=ascending]')).toContainText('Count');
  await expect(page.locator('t-table b')).toHaveCount(0);
  await expect(page.locator('t-table')).toHaveAttribute('data-selection', '{"selectedKeys":["a"]}');
  await page.getByRole('button', { name: 'Sort by Count' }).click();
  await expect(page.locator('t-table tbody tr').first()).toContainText('<b>Ada</b>');
  await page.getByRole('checkbox', { name: 'Select all rows' }).check();
  await expect(page.getByRole('checkbox', { name: 'Select row b', exact: true })).toBeChecked();
  await page.locator('t-table').evaluate((element: any) => (element.loading = true));
  await expect(page.getByRole('table')).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('status')).toHaveText('Loading…');
  await page.locator('t-table').evaluate((element: any) => {
    element.loading = false;
    element.rows = [];
  });
  await expect(page.getByRole('status')).toHaveText('No records.');
});

test('drawer traps focus, closes with Escape, and restores the opener', async ({ page }) => {
  await fixture(
    page,
    '<button id="open">Open drawer</button><t-drawer heading="Details"><label>Name<input></label><button slot="footer">Save</button></t-drawer><button>After</button>',
  );
  await page
    .locator('#open')
    .evaluate((element) =>
      element.addEventListener('click', () =>
        document.querySelector('t-drawer')!.show(element as HTMLElement),
      ),
    );
  await page.getByRole('button', { name: 'Open drawer' }).click();
  await expect(page.getByRole('dialog', { name: 'Details' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close drawer' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Save' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close drawer' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open drawer' })).toBeFocused();
  await page
    .locator('t-drawer')
    .evaluate((element: import('../src/components/drawer').TDrawer) => (element.open = true));
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close drawer' }).click();
  await expect(page.getByRole('button', { name: 'Open drawer' })).toBeFocused();
});

test('tree maintains one tabstop and supports branch, selection, and typeahead keys', async ({
  page,
}) => {
  await fixture(page, '<t-tree label="Files"></t-tree>');
  await page.locator('t-tree').evaluate((element: any) => {
    element.items = [
      {
        id: 'source',
        label: 'Source',
        children: [
          { id: 'locked', label: 'Locked', disabled: true },
          { id: 'index', label: 'index.ts' },
          { id: 'styles', label: 'styles.css' },
        ],
      },
      { id: 'readme', label: 'README.md' },
    ];
    element.addEventListener(
      't-select',
      (event: CustomEvent) => (element.dataset.selected = event.detail.value),
    );
  });
  const source = page.getByRole('treeitem', { name: 'Source', exact: true });
  await source.focus();
  await page.keyboard.press('ArrowRight');
  await expect(source).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('treeitem', { name: 'Locked' })).not.toHaveAttribute('tabindex');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('treeitem', { name: 'index.ts' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('treeitem', { name: 'styles.css' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(source).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(source).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('End');
  await page.keyboard.press('Space');
  await expect(page.locator('t-tree')).toHaveAttribute('data-selected', 'readme');
  await page.keyboard.press('s');
  await expect(source).toBeFocused();
  await expect(page.locator('t-tree [role=treeitem][tabindex="0"]')).toHaveCount(1);
  await expect(page.getByRole('treeitem', { name: 'README.md' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page
    .locator('t-tree')
    .evaluate((element: any) => (element.items = [{ id: 'replacement', label: 'Replacement' }]));
  await expect(page.getByRole('treeitem', { name: 'Replacement' })).toBeFocused();
});

test('new navigation and table surfaces pass automated accessibility checks', async ({ page }) => {
  await fixture(
    page,
    '<t-breadcrumb></t-breadcrumb><t-pagination total="32"></t-pagination><t-menu label="Actions"></t-menu><t-tree label="Files"></t-tree><t-table caption="People"></t-table>',
  );
  await page.evaluate(() => {
    document.querySelector('t-breadcrumb')!.items = [
      { label: 'Home', href: '#home' },
      { label: 'Library' },
    ];
    document.querySelector('t-menu')!.options = [{ value: 'open', label: 'Open' }];
    document.querySelector('t-tree')!.items = [
      { id: 'source', label: 'Source', children: [{ id: 'index', label: 'index.ts' }] },
    ];
    document.querySelector('t-tree')!.expandedIds = ['source'];
    document.querySelector('t-table')!.columns = [{ key: 'name', label: 'Name', sortable: true }];
    document.querySelector('t-table')!.rows = [{ id: 1, name: 'Ada' }];
  });
  const results = await new AxeBuilder({ page }).include('#fixture').analyze();
  expect(results.violations).toEqual([]);
});
