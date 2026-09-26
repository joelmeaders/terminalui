import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import type { TDock, DockChange } from '../src/components/dock';

type RecordedEvent = { type: string; detail: DockChange | { editing: boolean } };
const children = `<button id="alpha" data-dock-id="alpha" data-dock-label="Alpha">Alpha action</button>
  <span id="beta" data-dock-id="beta" data-dock-label="Beta"><label>Draft<input id="draft" value="Keep this value"></label></span>
  <t-button id="gamma" data-dock-id="gamma" data-dock-label="Gamma">Gamma action</t-button>`;

async function fixture(page: Page, markup = children, props: Partial<TDock> = {}) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.evaluate(async () => {
    if (!customElements.get('dock-test-slot'))
      customElements.define(
        'dock-test-slot',
        class extends HTMLElement {
          constructor() {
            super();
            this.attachShadow({ mode: 'open' }).innerHTML = '<slot name="content"></slot>';
          }
        },
      );
  });
  await page.locator('#fixture').evaluate(
    async (root, { markup, props }) => {
      document.body.style.cssText =
        'margin:0;padding:16px;background:var(--t-bg);color:var(--t-text);font-family:var(--t-font)';
      root.innerHTML = `<button id="before">Before</button><section id="region" aria-label="Workspace" style="position:relative;box-sizing:border-box;width:min(700px,100%);height:520px;border:1px solid var(--t-border);padding:12px"><t-dock id="dock" label="Workspace dock">${markup}</t-dock></section><button id="after">After</button>`;
      const style = document.createElement('style');
      style.textContent =
        '#fixture button,#fixture input{color:var(--t-text);background:var(--t-surface);border:1px solid var(--t-control-border);font:inherit;min-height:32px;min-width:24px;padding:4px 8px;box-sizing:border-box}';
      root.prepend(style);
      const dock = root.querySelector<TDock>('t-dock')!;
      dock.addEventListener(
        'pointerdown',
        (event) => {
          dock.dataset.pointer = String(event.pointerId);
        },
        true,
      );
      Object.assign(dock, props);
      await dock.updateComplete;
      const events: RecordedEvent[] = [];
      for (const type of ['t-input', 't-change', 't-edit'])
        dock.addEventListener(type, (event) => {
          // Record copied payloads. Later previews must not change earlier event evidence.
          events.push({ type, detail: structuredClone((event as CustomEvent).detail) });
          dock.dataset.events = JSON.stringify(events);
        });
      dock.dataset.events = '[]';
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    },
    { markup, props },
  );
}

async function setDock(page: Page, props: Partial<TDock>) {
  await page.locator('#dock').evaluate(async (host: TDock, props) => {
    Object.assign(host, props);
    await host.updateComplete;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }, props);
}

async function state(page: Page) {
  return page.locator('#dock').evaluate((host: TDock) => ({
    order: [...host.order],
    placement: host.placement,
    orientation: host.orientation,
    width: host.width,
    height: host.height,
  }));
}

async function events(page: Page): Promise<RecordedEvent[]> {
  return JSON.parse((await page.locator('#dock').getAttribute('data-events'))!);
}

async function edit(page: Page) {
  await page.getByRole('button', { name: 'Edit dock', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Finish editing dock', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move dock', exact: true })).toBeVisible();
}

async function ensureEditor(page: Page) {
  const editor = page.getByRole('dialog', { name: 'Workspace dock editor', exact: true });
  if (!(await editor.isVisible()))
    await page.getByRole('button', { name: 'Dock settings', exact: true }).click();
  await expect(editor).toBeVisible();
}

async function moveItem(page: Page, id: string, direction: 'earlier' | 'later') {
  await ensureEditor(page);
  await page.getByRole('combobox', { name: 'Item', exact: true }).selectOption(id);
  await page.getByRole('button', { name: `Move ${direction}`, exact: true }).click();
}

async function drag(page: Page, handle: Locator, x: number, y: number, commit = true) {
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 8 });
  if (commit) await page.mouse.up();
}

async function renderedOrder(page: Page) {
  return page.locator('#dock').evaluate((host: TDock) => {
    const vertical = host.orientation === 'vertical';
    const rtl = getComputedStyle(host).direction === 'rtl';
    return [...host.children]
      .filter((child) => child instanceof HTMLElement && !child.hidden)
      .map((child) => ({
        id: child.getAttribute('data-dock-id') || child.id,
        box: child.getBoundingClientRect(),
      }))
      .filter(({ box }) => box.width > 0 && box.height > 0)
      .sort((a, b) =>
        vertical
          ? a.box.top - b.box.top
          : rtl
            ? b.box.right - a.box.right
            : a.box.left - b.box.left,
      )
      .map(({ id }) => id);
  });
}

async function expectFocusVisible(control: Locator) {
  // Use real keyboard input so native :focus-visible follows keyboard modality.
  await control.page().keyboard.press('Tab');
  await control.scrollIntoViewIfNeeded();
  await control.focus();
  await expect(control).toBeFocused();
  const geometry = await control.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const extent = Math.max(
      0,
      Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset),
    );
    const clips: {
      name: string;
      left: number;
      right: number;
      top: number;
      bottom: number;
      x: boolean;
      y: boolean;
    }[] = [];
    let ancestor: Element | null = element.parentElement;
    while (ancestor) {
      const clip = ancestor as HTMLElement;
      const style = getComputedStyle(clip);
      const rect = clip.getBoundingClientRect();
      clips.push({
        name: `${clip.tagName}.${clip.className}`,
        left: rect.left + clip.clientLeft,
        right: rect.left + clip.clientLeft + clip.clientWidth,
        top: rect.top + clip.clientTop,
        bottom: rect.top + clip.clientTop + clip.clientHeight,
        x: ['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX),
        y: ['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowY),
      });
      const root = clip.getRootNode();
      ancestor = clip.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
    }
    return {
      outline: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth),
      left: box.left - extent,
      right: box.right + extent,
      top: box.top - extent,
      bottom: box.bottom + extent,
      viewport: innerWidth,
      height: innerHeight,
      clips,
    };
  });
  expect(geometry.outline).not.toBe('none');
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.left).toBeGreaterThanOrEqual(-0.5);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 0.5);
  expect(geometry.top).toBeGreaterThanOrEqual(-0.5);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.height + 0.5);
  for (const clip of geometry.clips) {
    if (clip.x) {
      expect(geometry.left, clip.name).toBeGreaterThanOrEqual(clip.left - 0.5);
      expect(geometry.right, clip.name).toBeLessThanOrEqual(clip.right + 0.5);
    }
    if (clip.y) {
      expect(geometry.top, clip.name).toBeGreaterThanOrEqual(clip.top - 0.5);
      expect(geometry.bottom, clip.name).toBeLessThanOrEqual(clip.bottom + 0.5);
    }
  }
}

for (const orientation of ['horizontal', 'vertical'] as const)
  for (const align of ['start', 'end', 'center', 'justify'] as const)
    test(`dock keeps one ${orientation === 'horizontal' ? 'row' : 'column'} with ${align} alignment and RTL`, async ({
      page,
    }) => {
      await fixture(
        page,
        '<button data-dock-id="a">One</button><button data-dock-id="b">Two</button><button data-dock-id="c">Three</button>',
        {
          orientation,
          align,
          width: orientation === 'horizontal' ? 500 : 160,
          height: orientation === 'vertical' ? 350 : 100,
        },
      );
      for (const dir of ['ltr', 'rtl']) {
        await page.locator('#dock').evaluate((host, dir) => {
          host.setAttribute('dir', dir);
        }, dir);
        const boxes = await page.locator('#dock [part=item]').evaluateAll((items) =>
          items.map((item) => {
            const box = item.getBoundingClientRect();
            return { x: box.x, y: box.y, width: box.width, height: box.height };
          }),
        );
        const cross = boxes.map((box) => (orientation === 'horizontal' ? box.y : box.x));
        expect(Math.max(...cross) - Math.min(...cross)).toBeLessThan(1);
        const strip = await page.locator('#dock [part=strip]').boundingBox();
        expect(strip).not.toBeNull();
        const mainStart = Math.min(
          ...boxes.map((box) => (orientation === 'horizontal' ? box.x : box.y)),
        );
        const mainEnd = Math.max(
          ...boxes.map((box) =>
            orientation === 'horizontal' ? box.x + box.width : box.y + box.height,
          ),
        );
        const start = orientation === 'horizontal' ? strip!.x : strip!.y;
        const end = start + (orientation === 'horizontal' ? strip!.width : strip!.height);
        const leading = mainStart - start;
        const trailing = end - mainEnd;
        if (align === 'center') expect(Math.abs(leading - trailing)).toBeLessThan(3);
        if (align === 'justify') {
          expect(leading).toBeLessThan(24);
          expect(trailing).toBeLessThan(24);
        }
        if (align === 'start' || align === 'end') {
          const startsAtRight = orientation === 'horizontal' && dir === 'rtl';
          const anchored = (align === 'start') !== startsAtRight ? leading : trailing;
          expect(anchored).toBeLessThan(24);
        }
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        ).toBe(true);
      }
    });

for (const editing of [false, true])
  test(`dock preserves text input and native radio arrows with editing ${editing}`, async ({
    page,
  }) => {
    await fixture(
      page,
      `<span data-dock-id="form"><label>Query<input id="query" value="abcd"></label><fieldset><legend>Mode</legend><label><input type="radio" name="mode" checked>List</label><label><input type="radio" name="mode">Grid</label></fieldset></span><t-toolbar data-dock-id="toolbar" label="Nested actions"><button>Refresh</button><button>Export</button></t-toolbar>`,
      { editing },
    );
    const query = page.getByRole('textbox', { name: 'Query', exact: true });
    await query.focus();
    await query.press('End');
    await query.press('ArrowLeft');
    await query.press('X');
    await expect(query).toHaveValue('abcXd');
    await page.getByRole('radio', { name: 'List', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: 'Grid', exact: true })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Grid', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Refresh', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeFocused();
    expect(await events(page)).toEqual([]);
  });

test('dock edit toggle gates all pointer handles and preserves embedded controls', async ({
  page,
}) => {
  await fixture(page);
  await expect(page.getByRole('group', { name: 'Workspace dock', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move dock', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resize dock', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Move Alpha', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Draft', exact: true }).fill('Still usable');
  await edit(page);
  for (const name of ['Move dock', 'Resize dock', 'Move Alpha']) {
    const handle = page.getByRole('button', { name, exact: true });
    await expect(handle).toBeVisible();
    const box = await handle.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(24);
    expect(box!.height).toBeGreaterThanOrEqual(24);
  }
  await ensureEditor(page);
  await expect(page.getByRole('combobox', { name: 'Item', exact: true })).toBeFocused();
  await page.getByRole('textbox', { name: 'Draft', exact: true }).focus();
  await expect(page.getByRole('textbox', { name: 'Draft', exact: true })).toBeFocused();
  await expect(
    page.getByRole('dialog', { name: 'Workspace dock editor', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Finish editing dock', exact: true }).focus();
  await page.getByRole('button', { name: 'Finish editing dock', exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: 'Edit dock', exact: true })).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Draft', exact: true })).toHaveValue(
    'Still usable',
  );
  expect(await events(page)).toEqual([
    { type: 't-edit', detail: { editing: true } },
    { type: 't-edit', detail: { editing: false } },
  ]);
});

for (const [handle, field] of [
  ['Move Beta', 'Item'],
  ['Move dock', 'Dock position'],
  ['Resize dock', 'Width (px)'],
]) {
  test(`keyboard activation of ${handle} opens its settings alternative`, async ({ page }) => {
    await fixture(page, children, { editing: true });
    const button = page.getByRole('button', { name: handle, exact: true });
    await button.focus();
    await button.press('Enter');
    await expect(
      page.getByRole(field === 'Width (px)' ? 'spinbutton' : 'combobox', {
        name: field,
        exact: true,
      }),
    ).toBeFocused();
    if (handle === 'Move Beta')
      await expect(page.getByRole('combobox', { name: 'Item', exact: true })).toHaveValue('beta');
    await expect(page.getByRole('button', { name: 'Finish editing', exact: true })).toBeVisible();
    expect((await events(page)).filter((event) => event.type === 't-change')).toEqual([]);
  });
}

test('control reorder changes rendered Tab order without moving light DOM or recreating content', async ({
  page,
}) => {
  await fixture(page, children, { editing: true });
  await page.getByRole('textbox', { name: 'Draft', exact: true }).fill('User draft');
  await page.locator('#dock').evaluate((host) => {
    const original = [...host.children];
    (host as TDock & { savedChildren?: Element[] }).savedChildren = original;
  });
  await moveItem(page, 'gamma', 'earlier');
  await moveItem(page, 'gamma', 'earlier');
  expect(await renderedOrder(page)).toEqual(['gamma', 'alpha', 'beta']);
  expect(
    await page
      .locator('#dock')
      .evaluate((host: TDock & { savedChildren?: Element[] }) =>
        [...host.children].every((child, index) => child === host.savedChildren![index]),
      ),
  ).toBe(true);
  await expect(page.getByRole('textbox', { name: 'Draft', exact: true })).toHaveValue('User draft');
  await setDock(page, { editing: false });
  await page.locator('#before').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Gamma action', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Alpha action', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Draft', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Edit dock', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
});

test('external order preserves nested input identity, value, selection and focus without events', async ({
  page,
}) => {
  await fixture(page);
  const input = page.getByRole('textbox', { name: 'Draft', exact: true });
  await input.fill('Keep selection');
  await input.focus();
  await input.evaluate((input: HTMLInputElement) => {
    input.setSelectionRange(2, 6);
  });
  await setDock(page, { order: ['gamma', 'beta', 'alpha'] });
  expect(await renderedOrder(page)).toEqual(['gamma', 'beta', 'alpha']);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Keep selection');
  expect(
    await input.evaluate((input: HTMLInputElement) => [input.selectionStart, input.selectionEnd]),
  ).toEqual([2, 6]);
  expect(await events(page)).toEqual([]);
});

test('initial render and passive live changes preserve outside focus', async ({ page }) => {
  await fixture(page);
  await page.locator('#after').focus();
  await setDock(page, {
    editing: true,
    orientation: 'vertical',
    align: 'end',
    order: ['beta', 'alpha', 'gamma'],
    width: 190,
    height: 350,
  });
  await page.locator('#dock').evaluate(async (host: TDock) => {
    const fresh = document.createElement('t-dock') as TDock;
    host.after(fresh);
    await fresh.updateComplete;
    fresh.remove();
    host.querySelector('#gamma')!.remove();
    await host.updateComplete;
  });
  await expect(page.locator('#after')).toBeFocused();
  expect(await events(page)).toEqual([]);
});

test('removing the focused item recovers to Edit and preserves an explicit application blur focus move', async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole('textbox', { name: 'Draft', exact: true }).focus();
  await page.locator('#beta').evaluate((item) => item.remove());
  await expect(page.getByRole('button', { name: 'Edit dock', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Gamma action', exact: true }).evaluate((button) =>
    button.addEventListener(
      'blur',
      () => {
        button.setAttribute('data-blur-handled', 'true');
        document.querySelector<HTMLButtonElement>('#after')!.focus();
      },
      { once: true },
    ),
  );
  await page.getByRole('button', { name: 'Gamma action', exact: true }).focus();
  await page
    .getByRole('button', { name: 'Gamma action', exact: true })
    .evaluate((button: HTMLButtonElement) => button.blur());
  await expect(page.getByRole('button', { name: 'Gamma action', exact: true })).toHaveAttribute(
    'data-blur-handled',
    'true',
  );
  await expect(page.locator('#after')).toBeFocused();
  await page.locator('#gamma').evaluate((item) => item.remove());
  await expect(page.locator('#after')).toBeFocused();
  expect(await events(page)).toEqual([]);

  await fixture(page, children, { editing: true });
  await page.getByRole('textbox', { name: 'Draft', exact: true }).focus();
  await page.locator('#beta').evaluate((item) => item.remove());
  await expect(page.getByRole('button', { name: 'Move Gamma', exact: true })).toBeFocused();
  expect(await events(page)).toEqual([]);
});

test('reorder keeps an application event-handler focus move outside the dock', async ({ page }) => {
  await fixture(page, children, { editing: true });
  await page
    .locator('#dock')
    .evaluate((host) =>
      host.addEventListener('t-change', () =>
        document.querySelector<HTMLButtonElement>('#after')!.focus(),
      ),
    );
  await moveItem(page, 'beta', 'earlier');
  await expect(page.locator('#after')).toBeFocused();
  expect(await renderedOrder(page)).toEqual(['beta', 'alpha', 'gamma']);
});

for (const exit of ['property', 'Escape'] as const)
  test(`dock edit exit via ${exit} restores the visible edit control`, async ({ page }) => {
    await fixture(page, children, { editing: true });
    await ensureEditor(page);
    await page.getByRole('spinbutton', { name: 'Width (px)', exact: true }).focus();
    if (exit === 'Escape') await page.keyboard.press('Escape');
    else await setDock(page, { editing: false });
    await expect(
      page.getByRole('dialog', { name: 'Workspace dock editor', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit dock', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#after')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Edit dock', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Gamma action', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('textbox', { name: 'Draft', exact: true })).toBeFocused();
  });

test('position control snaps to all edges, preserves explicit orientation and returns inline', async ({
  page,
}) => {
  await fixture(page, children, {
    editing: true,
    autoOrient: false,
    orientation: 'horizontal',
    width: 240,
    height: 140,
  });
  await ensureEditor(page);
  const position = page.getByRole('combobox', { name: 'Dock position', exact: true });
  for (const placement of ['top', 'bottom', 'left', 'right', 'inline'] as const) {
    await position.selectOption(placement);
    const current = await state(page);
    expect(current.placement).toBe(placement);
    expect(current.orientation).toBe('horizontal');
    const dock = await page.locator('#dock [part=dock]').boundingBox();
    const region = await page.locator('#region').boundingBox();
    expect(dock!.x).toBeGreaterThanOrEqual(region!.x - 1);
    expect(dock!.y).toBeGreaterThanOrEqual(region!.y - 1);
    expect(dock!.x + dock!.width).toBeLessThanOrEqual(region!.x + region!.width + 1);
    expect(dock!.y + dock!.height).toBeLessThanOrEqual(region!.y + region!.height + 1);
  }
  const history = (await events(page)).filter((event) => event.type === 't-change');
  expect(history).toHaveLength(5);
  for (const event of history)
    expect(event.detail).toMatchObject({
      operation: 'snap',
      source: 'control',
      orientation: 'horizontal',
    });
});

test('size fields adjust both dimensions, apply limits and produce exact committed event payloads', async ({
  page,
}) => {
  await fixture(page, children, {
    editing: true,
    width: 300,
    height: 180,
    minWidth: 160,
    minHeight: 100,
    maxWidth: 450,
    maxHeight: 300,
  });
  await ensureEditor(page);
  const width = page.getByRole('spinbutton', { name: 'Width (px)', exact: true });
  const height = page.getByRole('spinbutton', { name: 'Height (px)', exact: true });
  await width.fill('340');
  await width.press('Enter');
  await height.fill('220');
  await height.press('Enter');
  expect(await state(page)).toMatchObject({ width: 340, height: 220 });
  await width.fill('9999');
  await width.press('Enter');
  await height.fill('1');
  await height.press('Enter');
  expect(await state(page)).toMatchObject({ width: 450, height: 100 });
  const history = await events(page);
  expect(history.map(({ type }) => type)).toEqual([
    't-input',
    't-change',
    't-input',
    't-change',
    't-input',
    't-change',
    't-input',
    't-change',
  ]);
  expect(history.at(-1)!.detail).toEqual({
    operation: 'resize',
    source: 'control',
    order: ['alpha', 'beta', 'gamma'],
    placement: 'inline',
    orientation: 'horizontal',
    width: 450,
    height: 100,
  });
});

test('item selector and move buttons provide a complete non-drag reorder alternative', async ({
  page,
}) => {
  await fixture(page, children, { editing: true });
  await ensureEditor(page);
  await page.getByRole('combobox', { name: 'Item', exact: true }).selectOption('alpha');
  await expect(page.getByRole('button', { name: 'Move earlier', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Move later', exact: true }).focus();
  await page.keyboard.press('Enter');
  expect(await renderedOrder(page)).toEqual(['beta', 'alpha', 'gamma']);
  await page.keyboard.press('Space');
  expect(await renderedOrder(page)).toEqual(['beta', 'gamma', 'alpha']);
  await expect(page.getByRole('button', { name: 'Move later', exact: true })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Item', exact: true })).toHaveValue('alpha');
  const history = await events(page);
  expect(history.map(({ type }) => type)).toEqual(['t-input', 't-change', 't-input', 't-change']);
  expect(history.at(-1)!.detail).toEqual({
    operation: 'reorder',
    source: 'control',
    order: ['beta', 'gamma', 'alpha'],
    placement: 'inline',
    orientation: 'horizontal',
    width: 0,
    height: 0,
  });
  await expect(page.getByRole('status')).not.toHaveText('');
});

for (const orientation of ['horizontal', 'vertical'] as const)
  test(`primary pointer reorders ${orientation} items with preview and one commit`, async ({
    page,
  }) => {
    await fixture(
      page,
      '<button data-dock-id="alpha" data-dock-label="Alpha">Alpha action</button><button data-dock-id="beta" data-dock-label="Beta">Beta action</button><button data-dock-id="gamma" data-dock-label="Gamma">Gamma action</button>',
      {
        orientation,
        width: 560,
        height: orientation === 'vertical' ? 350 : 120,
      },
    );
    await edit(page);
    await expect(
      page.getByRole('dialog', { name: 'Workspace dock editor', exact: true }),
    ).toHaveCount(0);
    const target = await page.locator('#dock [part=strip]').boundingBox();
    await drag(
      page,
      page.getByRole('button', { name: 'Move Alpha', exact: true }),
      orientation === 'horizontal' ? target!.x + target!.width - 10 : target!.x + target!.width / 2,
      orientation === 'vertical' ? target!.y + target!.height - 10 : target!.y + target!.height / 2,
      false,
    );
    if (orientation === 'horizontal') {
      // Continue a real drag at the scroll edge until the final item is reachable.
      for (let i = 0; i < 12; i++)
        await page.mouse.move(
          target!.x + target!.width - (i % 2 ? 8 : 10),
          target!.y + target!.height / 2,
        );
    }
    await expect
      .poll(async () => (await events(page)).filter((event) => event.type === 't-input').length)
      .toBeGreaterThan(0);
    expect((await events(page)).filter((event) => event.type === 't-change')).toEqual([]);
    await page.mouse.up();
    expect(await renderedOrder(page)).toEqual(['beta', 'gamma', 'alpha']);
    const history = await events(page);
    expect(history.filter((event) => event.type === 't-change')).toHaveLength(1);
    expect(history.at(-1)!.detail).toMatchObject({
      operation: 'reorder',
      source: 'pointer',
      order: ['beta', 'gamma', 'alpha'],
      orientation,
    });
  });

test('secondary pointer buttons cannot start dock editing operations', async ({ page }) => {
  await fixture(page, children, { editing: true });
  const handle = page.getByRole('button', { name: 'Move Alpha', exact: true });
  const box = await handle.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(box!.x + 100, box!.y + 50);
  await page.mouse.up({ button: 'right' });
  expect(await renderedOrder(page)).toEqual(['alpha', 'beta', 'gamma']);
  expect(await events(page)).toEqual([]);
});

for (const snapTarget of ['parent', 'viewport'] as const)
  test(`dock pointer drag snaps to each ${snapTarget} edge and remains within that target`, async ({
    page,
  }) => {
    await fixture(page, children, { editing: true, snapTarget, width: 220, height: 110 });
    for (const placement of ['top', 'bottom', 'left', 'right'] as const) {
      await setDock(page, { placement: 'inline', orientation: 'horizontal' });
      const target =
        snapTarget === 'parent'
          ? await page.locator('#region').boundingBox()
          : { x: 0, y: 0, width: 1280, height: 720 };
      const viewport = page.viewportSize()!;
      if (snapTarget === 'viewport')
        Object.assign(target!, { width: viewport.width, height: viewport.height });
      const x =
        placement === 'left'
          ? target!.x + 2
          : placement === 'right'
            ? target!.x + target!.width - 2
            : target!.x + target!.width / 2;
      const y =
        placement === 'top'
          ? target!.y + 2
          : placement === 'bottom'
            ? target!.y + target!.height - 2
            : target!.y + target!.height / 2;
      await drag(page, page.getByRole('button', { name: 'Move dock', exact: true }), x, y);
      expect(await state(page)).toMatchObject({
        placement,
        orientation: placement === 'left' || placement === 'right' ? 'vertical' : 'horizontal',
      });
      const dock = await page.locator('#dock [part=dock]').boundingBox();
      expect(dock!.x).toBeGreaterThanOrEqual(target!.x - 1);
      expect(dock!.y).toBeGreaterThanOrEqual(target!.y - 1);
      expect(dock!.x + dock!.width).toBeLessThanOrEqual(target!.x + target!.width + 1);
      expect(dock!.y + dock!.height).toBeLessThanOrEqual(target!.y + target!.height + 1);
    }
    const commits = (await events(page)).filter((event) => event.type === 't-change');
    expect(commits).toHaveLength(4);
    for (const event of commits)
      expect(event.detail).toMatchObject({ operation: 'snap', source: 'pointer' });
  });

test('pointer resize changes width and height together within declared bounds', async ({
  page,
}) => {
  await fixture(page, children, {
    editing: true,
    width: 260,
    height: 150,
    minWidth: 180,
    minHeight: 100,
    maxWidth: 420,
    maxHeight: 280,
  });
  const handle = page.getByRole('button', { name: 'Resize dock', exact: true });
  const box = await handle.boundingBox();
  await drag(page, handle, box!.x + box!.width / 2 + 95, box!.y + box!.height / 2 + 70);
  expect(await state(page)).toMatchObject({ width: 355, height: 220 });
  const next = await handle.boundingBox();
  const viewport = page.viewportSize()!;
  await drag(
    page,
    handle,
    Math.min(viewport.width - 1, next!.x + 500),
    Math.min(viewport.height - 1, next!.y + 400),
  );
  expect(await state(page)).toMatchObject({ width: 420, height: 280 });
  let shrinkDrags = 0;
  while ((await state(page)).height > 100 && shrinkDrags < 4) {
    await drag(page, handle, 1, 1);
    shrinkDrags++;
  }
  expect(await state(page)).toMatchObject({ width: 180, height: 100 });
  expect((await events(page)).filter((event) => event.type === 't-change')).toHaveLength(
    2 + shrinkDrags,
  );
});

test('resize handle supports both dimensions with keyboard step and retains focus', async ({
  page,
}) => {
  await fixture(page, children, {
    editing: true,
    width: 260,
    height: 150,
    step: 10,
    minWidth: 180,
    minHeight: 100,
    maxWidth: 420,
    maxHeight: 280,
  });
  const handle = page.getByRole('button', { name: 'Resize dock', exact: true });
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  expect(await state(page)).toMatchObject({ width: 270, height: 160 });
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  expect(await state(page)).toMatchObject({ width: 370, height: 260 });
  await expect(handle).toBeFocused();
  for (const event of (await events(page)).filter((event) => event.type === 't-change'))
    expect(event.detail).toMatchObject({ operation: 'resize', source: 'keyboard' });
});

for (const cancellation of ['Escape', 'pointercancel', 'lostpointercapture', 'edit exit'] as const)
  test(`${cancellation} rolls pointer resize back without a committed change`, async ({ page }) => {
    await fixture(page, children, { editing: true, width: 260, height: 150 });
    const handle = page.getByRole('button', { name: 'Resize dock', exact: true });
    const box = await handle.boundingBox();
    await drag(page, handle, box!.x + 80, box!.y + 70, false);
    await expect.poll(async () => (await state(page)).width).not.toBe(260);
    if (cancellation === 'Escape') await page.keyboard.press('Escape');
    else if (cancellation === 'edit exit') await setDock(page, { editing: false });
    else {
      await page.locator('#dock [part=dock]').evaluate((group, type) => {
        const pointerId = Number(
          group.getRootNode() instanceof ShadowRoot
            ? (group.getRootNode() as ShadowRoot).host.getAttribute('data-pointer')
            : NaN,
        );
        if (!group.hasPointerCapture(pointerId))
          throw new Error('The active pointer must be captured.');
        if (type === 'lostpointercapture') group.releasePointerCapture(pointerId);
        else group.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId }));
      }, cancellation);
      // Deliver the browser's queued lost-capture event before releasing the mouse.
      if (cancellation === 'lostpointercapture') await page.mouse.move(box!.x + 82, box!.y + 72);
    }
    await page.mouse.up();
    expect(await state(page)).toMatchObject({ width: 260, height: 150 });
    expect((await events(page)).filter((event) => event.type === 't-change')).toEqual([]);
  });

test('disconnect cancels a pointer preview and restores original slots before reconnection', async ({
  page,
}) => {
  await fixture(
    page,
    '<button id="alpha" data-dock-id="alpha" data-dock-label="Alpha" slot="original">Alpha action</button><button id="beta" data-dock-id="beta" data-dock-label="Beta">Beta action</button>',
    { editing: true, width: 260, height: 150 },
  );
  const handle = page.getByRole('button', { name: 'Resize dock', exact: true });
  const box = await handle.boundingBox();
  await drag(page, handle, box!.x + 80, box!.y + 70, false);
  const detached = await page.locator('#dock').evaluate((host: TDock) => {
    (window as Window & { detachedDock?: TDock }).detachedDock = host;
    host.remove();
    return {
      width: host.width,
      height: host.height,
      slots: [...host.children].map((item) => item.getAttribute('slot')),
    };
  });
  await page.mouse.up();
  expect(detached).toEqual({ width: 260, height: 150, slots: ['original', null] });
  await page.locator('#after').focus();
  await page
    .locator('#region')
    .evaluate((region) =>
      region.append((window as Window & { detachedDock?: TDock }).detachedDock!),
    );
  await expect(page.locator('#after')).toBeFocused();
  expect((await events(page)).filter((event) => event.type === 't-change')).toEqual([]);
});

test('Escape rolls reorder and snap previews back without committing either operation', async ({
  page,
}) => {
  for (const operation of ['reorder', 'snap']) {
    await fixture(page, children, { editing: true, width: 400, height: 160 });
    const initial = await state(page);
    if (operation === 'reorder') {
      const target = await page
        .getByRole('button', { name: 'Gamma action', exact: true })
        .boundingBox();
      await drag(
        page,
        page.getByRole('button', { name: 'Move Alpha', exact: true }),
        target!.x + target!.width - 2,
        target!.y + target!.height - 2,
        false,
      );
    } else {
      const target = await page.locator('#region').boundingBox();
      await drag(
        page,
        page.getByRole('button', { name: 'Move dock', exact: true }),
        target!.x + target!.width - 2,
        target!.y + target!.height / 2,
        false,
      );
    }
    await expect
      .poll(async () => (await events(page)).filter((event) => event.type === 't-input').length)
      .toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    expect(await state(page)).toEqual(initial);
    expect(await renderedOrder(page)).toEqual(['alpha', 'beta', 'gamma']);
    expect((await events(page)).filter((event) => event.type === 't-change')).toEqual([]);
  }
});

test('disabled dock controls leave nested content enabled and do not take outside focus', async ({
  page,
}) => {
  await fixture(page, children, { editing: true });
  await page.getByRole('button', { name: 'Resize dock', exact: true }).focus();
  await setDock(page, { disabled: true });
  const group = page.getByRole('group', { name: 'Workspace dock', exact: true });
  await expect(group).toBeFocused();
  for (const name of ['Edit dock', 'Move dock', 'Resize dock']) {
    const control = page.getByRole('button', { name, exact: true });
    if (await control.count()) await expect(control).toBeDisabled();
  }
  await expect(page.getByRole('textbox', { name: 'Draft', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Gamma action', exact: true })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Draft', exact: true }).fill('Enabled content');
  await page.locator('#after').focus();
  await setDock(page, { disabled: false });
  await setDock(page, { disabled: true });
  await expect(page.locator('#after')).toBeFocused();
  expect(await events(page)).toEqual([]);
});

test('native separators remain semantic and preserve rendered nested slot Tab order', async ({
  page,
}) => {
  await fixture(
    page,
    '<dock-test-slot id="alpha" data-dock-id="alpha"><t-button slot="content">Nested action</t-button></dock-test-slot><hr id="divider" data-dock-id="divider"><button id="beta" data-dock-id="beta">Final action</button>',
    { order: ['beta', 'divider', 'alpha'] },
  );
  await expect(page.getByRole('separator')).toHaveCount(1);
  await expect(page.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  await page.locator('html').evaluate((element) => element.setAttribute('data-lines', 'bold'));
  await expect(page.getByRole('separator')).toHaveCSS('border-inline-start-width', '2px');
  await setDock(page, { orientation: 'vertical' });
  await expect(page.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');
  await expect(page.getByRole('separator')).toHaveCSS('border-block-start-width', '2px');
  await setDock(page, { orientation: 'horizontal' });
  await page.locator('#before').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Final action', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Nested action', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Edit dock', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
});

test('live hidden and inert items leave the native Tab sequence and preserve outside focus', async ({
  page,
}) => {
  await fixture(page);
  await page.locator('#after').focus();
  await page.locator('#beta').evaluate((item: HTMLElement) => {
    item.inert = true;
  });
  await page.locator('#gamma').evaluate((item: HTMLElement) => {
    item.hidden = true;
  });
  await expect(page.locator('#after')).toBeFocused();
  await page.getByRole('button', { name: 'Alpha action', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Edit dock', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
  await page.locator('#beta').evaluate((item: HTMLElement) => {
    item.inert = false;
  });
  await page.locator('#gamma').evaluate((item: HTMLElement) => {
    item.hidden = false;
  });
  await page.getByRole('button', { name: 'Alpha action', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Draft', exact: true })).toBeFocused();
  expect(await events(page)).toEqual([]);
});

test('dock edits inside a modal remain in its Tab cycle and restore the modal opener', async ({
  page,
}) => {
  await fixture(page);
  await page.locator('#region').evaluate((region) => {
    const dialog = document.createElement('t-dialog');
    dialog.heading = 'Dock workspace';
    region.before(dialog);
    dialog.append(region);
    const opener = document.querySelector<HTMLButtonElement>('#before')!;
    opener.focus();
    dialog.show(opener);
  });
  await edit(page);
  await moveItem(page, 'gamma', 'earlier');
  await page.getByRole('spinbutton', { name: 'Height (px)', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Edit dock', exact: true })).toBeFocused();
  await expect(page.getByRole('dialog', { name: 'Dock workspace', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#before')).toBeFocused();
});

test('adopted docks use their owning document and preserve focus outside an inactive frame', async ({
  page,
}) => {
  await fixture(page, children, { editing: true });
  await page.locator('#dock').evaluate(async (host: TDock) => {
    const frame = document.createElement('iframe');
    frame.title = 'Embedded dock';
    frame.style.cssText = 'width:700px;height:520px';
    document.querySelector('#fixture')!.append(frame);
    frame.contentDocument!.body.append(frame.contentDocument!.adoptNode(host));
    await host.updateComplete;
  });
  const embedded = page.frameLocator('iframe');
  await embedded.getByRole('button', { name: 'Dock settings', exact: true }).click();
  await embedded.getByRole('spinbutton', { name: 'Width (px)', exact: true }).focus();
  await embedded.locator('#dock').evaluate(async (host: TDock) => {
    host.editing = false;
    await host.updateComplete;
  });
  await expect(embedded.getByRole('button', { name: 'Edit dock', exact: true })).toBeFocused();
  await embedded.locator('#dock').evaluate(async (host: TDock) => {
    const item = host.ownerDocument.createElement('div');
    item.dataset.dockId = 'embedded';
    item.dataset.dockLabel = 'Embedded record';
    const root = item.attachShadow({ mode: 'open' });
    root.innerHTML = '<input aria-label="Embedded record" value="Preserved frame value">';
    host.append(item);
    await host.updateComplete;
  });
  await embedded.getByRole('textbox', { name: 'Embedded record', exact: true }).focus();
  await embedded.locator('#dock').evaluate(async (host: TDock) => {
    (host.querySelector('[data-dock-id=embedded]') as HTMLElement).inert = true;
    await host.updateComplete;
  });
  await expect(embedded.getByRole('button', { name: 'Edit dock', exact: true })).toBeFocused();
  await expect(embedded.getByRole('textbox', { name: 'Embedded record', exact: true })).toHaveValue(
    'Preserved frame value',
  );
  await page.locator('#after').click();
  await page.locator('#after').focus();
  await expect(page.locator('#after')).toBeFocused();
  await embedded.locator('#dock').evaluate(async (host: TDock) => {
    host.order = ['gamma', 'beta', 'alpha'];
    host.querySelector('#beta')!.remove();
    await host.updateComplete;
  });
  await expect(page.locator('#after')).toBeFocused();
});

test('snapped dock remains inside a parent after its dimensions change', async ({ page }) => {
  await fixture(page, children, { placement: 'bottom', width: 600, height: 200 });
  await page.locator('#region').evaluate((region: HTMLElement) => {
    region.style.width = '300px';
    region.style.height = '300px';
  });
  await expect
    .poll(async () => {
      const box = await page.locator('#dock [part=dock]').boundingBox();
      const region = await page.locator('#region').boundingBox();
      return (
        !!box &&
        !!region &&
        box.width <= region.width + 1 &&
        box.x >= region.x - 1 &&
        box.x + box.width <= region.x + region.width + 1 &&
        box.y + box.height <= region.y + region.height + 1
      );
    })
    .toBe(true);
  expect(await events(page)).toEqual([]);
});

for (const preference of ['normal', 'enlarged', 'spaced'] as const)
  test(`dock and edit controls reflow at 320 CSS pixels with ${preference} text`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await fixture(
      page,
      `<button data-dock-id="alpha" data-dock-label="Long action label">Long action label that needs readable space</button><span data-dock-id="beta"><label>Draft<input style="inline-size:10ch;max-inline-size:100%;min-inline-size:0;box-sizing:border-box" value="Text remains reachable"></label></span><button data-dock-id="gamma">Last action</button>`,
      { editing: true },
    );
    await ensureEditor(page);
    await page.locator('#dock').evaluate((host: TDock, preference) => {
      document.documentElement.setAttribute('data-density', 'compact');
      if (preference === 'enlarged') {
        const elements = [
          host,
          ...host.querySelectorAll<HTMLElement>('*'),
          ...host.shadowRoot!.querySelectorAll<HTMLElement>('*'),
        ];
        const sizes = elements.map((element) => ({
          element,
          size: Number.parseFloat(getComputedStyle(element).fontSize),
        }));
        for (const { element, size } of sizes) element.style.fontSize = `${size * 2}px`;
      }
      if (preference === 'spaced') {
        const declarations =
          '{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}';
        const light = document.createElement('style');
        light.textContent = `#dock,#dock *${declarations}`;
        document.head.append(light);
        const shadow = document.createElement('style');
        shadow.textContent = `*${declarations}`;
        host.shadowRoot!.append(shadow);
      }
    }, preference);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    for (const name of ['Item', 'Dock position'])
      await expectFocusVisible(page.getByRole('combobox', { name, exact: true }));
    for (const name of ['Width (px)', 'Height (px)'])
      await expectFocusVisible(page.getByRole('spinbutton', { name, exact: true }));
    await expectFocusVisible(page.getByRole('button', { name: 'Finish editing', exact: true }));
    await page.getByRole('button', { name: 'Finish editing', exact: true }).click();
    await expectFocusVisible(page.getByRole('button', { name: 'Edit dock', exact: true }));
    await expectFocusVisible(page.getByRole('textbox', { name: 'Draft', exact: true }));
    if (preference !== 'spaced')
      await page.screenshot({ path: testInfo.outputPath(`dock-320-${preference}.png`) });
  });

test('settings cleanup survives a pending update while disconnected and restores on reconnect', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await fixture(page, children, { editing: true });
  await ensureEditor(page);
  await page.locator('#dock').evaluate(async (host: TDock) => {
    const parent = host.parentElement!;
    const children = [...host.children];
    host.order = ['gamma', 'beta', 'alpha'];
    host.remove();
    await host.updateComplete;
    if (children.some((child) => child.hasAttribute('slot')))
      throw new Error('Disconnected slots must be restored.');
    parent.append(host);
    await host.updateComplete;
  });
  await expect(
    page.getByRole('dialog', { name: 'Workspace dock editor', exact: true }),
  ).toBeVisible();
  expect((await state(page)).order).toEqual(['gamma', 'beta', 'alpha']);
  await page.getByRole('combobox', { name: 'Item', exact: true }).selectOption('beta');
  await page.getByRole('button', { name: 'Move earlier', exact: true }).click();
  expect(errors).toEqual([]);
  expect(await renderedOrder(page)).toHaveLength(3);
});

test('viewport snapping follows a resized and offset visual viewport', async ({ page }) => {
  await fixture(page, children, { width: 200, height: 100, snapTarget: 'viewport' });
  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    for (const [key, value] of Object.entries({
      offsetLeft: 30,
      offsetTop: 40,
      width: 250,
      height: 300,
    }))
      Object.defineProperty(viewport, key, { configurable: true, get: () => value });
  });
  for (const placement of ['top', 'bottom', 'left', 'right'] as const) {
    await setDock(page, { placement });
    const rect = await page.locator('#dock').boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.x).toBeCloseTo(placement === 'right' ? 80 : 30, 0);
    expect(rect!.y).toBeCloseTo(placement === 'bottom' ? 240 : 40, 0);
    expect(rect!.width).toBeCloseTo(200, 0);
    expect(rect!.height).toBeCloseTo(100, 0);
  }
  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    Object.defineProperty(viewport, 'offsetLeft', { configurable: true, get: () => 50 });
    viewport.dispatchEvent(new Event('scroll'));
  });
  await expect.poll(async () => (await page.locator('#dock').boundingBox())!.x).toBeCloseTo(100, 0);
  await setDock(page, { snapTarget: 'parent', placement: 'top' });
  const parent = await page.locator('#region').boundingBox();
  const dock = await page.locator('#dock').boundingBox();
  expect(dock!.x).toBeCloseTo(parent!.x + 1, 0);
  expect(dock!.y).toBeCloseTo(parent!.y + 1, 0);
});

test('dock enabled, editing and disabled states retain six-palette axe evidence', async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  await fixture(page);
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((html, theme) => html.setAttribute('data-theme', theme), theme);
    for (const mode of ['enabled', 'editing', 'settings', 'disabled'] as const) {
      await setDock(page, {
        editing: mode === 'editing' || mode === 'settings',
        disabled: mode === 'disabled',
      });
      if (mode === 'settings') await ensureEditor(page);
      const axe = await new AxeBuilder({ page }).include('#dock').analyze();
      await writeFile(
        testInfo.outputPath(`dock-${theme}-${mode}-axe-review.json`),
        JSON.stringify(
          {
            browser: browser.version(),
            os: process.platform,
            violations: axe.violations,
            incomplete: axe.incomplete,
          },
          null,
          2,
        ),
      );
      expect(axe.violations, `${theme} ${mode}: ${JSON.stringify(axe.violations)}`).toEqual([]);
      expect(
        axe.incomplete.filter((finding) => finding.id === 'aria-valid-attr-value'),
        `${theme} ${mode}: settings must not expose unresolved ARIA relationships`,
      ).toEqual([]);
    }
  }
  await setDock(page, { editing: true, disabled: false, placement: 'right' });
  await ensureEditor(page);
  await page.screenshot({ path: testInfo.outputPath('dock-edge-editor.png') });
});
