import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function mount(page: Page, markup: string, icons = false) {
  await page.route('**/@vite/client', (r) => r.abort());
  await page.goto(icons ? '/tests/icons-fixture.html' : '/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor({ state: 'attached' });
  await page.locator('#fixture').evaluate((el, html) => {
    el.innerHTML = html;
  }, markup);
}
test('built-in and fallback icons render real SVG geometry', async ({ page }) => {
  await mount(
    page,
    '<section style="color:rgb(123, 45, 67)"><t-icon name="copy" label="Copy symbol"></t-icon></section><t-icon name="unknown-icon" label="Fallback symbol"></t-icon><t-icon name="constructor"></t-icon><t-icon name="toString"></t-icon><t-icon name="__proto__"></t-icon><t-copy-button value="status"></t-copy-button>',
  );
  const paths = page.locator('t-icon path');
  expect(await paths.count()).toBe(6);
  const geometry = await paths.evaluateAll((nodes) =>
    nodes.map((node) => ({
      svg: node instanceof SVGPathElement,
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
    })),
  );
  for (const path of geometry) {
    expect(path.svg).toBe(true);
    expect(path.width).toBeGreaterThan(0);
    expect(path.height).toBeGreaterThan(0);
  }
  await expect(page.locator('t-icon[name="copy"]').first()).toHaveCSS('color', 'rgb(123, 45, 67)');
  const actionColor = await page
    .locator('t-copy-button button')
    .evaluate((el) => getComputedStyle(el).color);
  await expect(page.locator('t-copy-button t-icon')).toHaveCSS('color', actionColor);
});
test('real data from seven free icon providers renders with names and provider geometry', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mount(page, '', true);
  const names = await page.evaluate(() => {
    const examples = (window as any).providerExamples as { name: string; provider: string }[];
    document.querySelector('#fixture')!.innerHTML =
      examples.map((i) => `<t-icon name="${i.name}" label="${i.provider}"></t-icon>`).join('') +
      '<t-icon-button name="fa:github" label="View source"></t-icon-button><t-icon name="fa:heart"></t-icon>';
    return examples;
  });
  expect(names).toHaveLength(7);
  for (const { name, provider } of names) {
    const icon = page.locator(`t-icon[name="${name}"]`);
    await expect(icon.getByRole('img', { name: provider, exact: true })).toBeVisible();
    await expect(icon.locator('svg')).toHaveAttribute('data-provider', '');
    expect(await icon.locator('svg path,svg rect,svg circle').count()).toBeGreaterThan(0);
  }
  await expect(page.locator('t-icon[name="fa:rocket"] svg')).toHaveAttribute(
    'viewBox',
    '0 0 512 512',
  );
  await expect(page.locator('t-icon[name="lucide:camera"] svg g')).toHaveAttribute(
    'stroke',
    'currentColor',
  );
  await expect(page.locator('t-icon[name="ion:rocket"] svg')).toHaveAttribute(
    'viewBox',
    '0 0 512 512',
  );
  await expect(page.locator('t-icon[name="fa:heart"] svg')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('button', { name: 'View source' })).toBeVisible();
  expect(errors).toEqual([]);
  const result = await new AxeBuilder({ page }).include('#fixture').analyze();
  expect(result.violations).toEqual([]);
  await testInfo.attach('axe-icons-review-needed.json', {
    body: JSON.stringify(result.incomplete, null, 2),
    contentType: 'application/json',
  });
});
test('registration updates existing icons, snapshots data, resolves aliases and survives reconnect', async ({
  page,
}) => {
  await mount(page, '<t-icon name="custom:test" label="Custom shape"></t-icon>', true);
  await page.evaluate(() => {
    const api = (window as any).iconAPI;
    api.registerIconSet(
      {
        prefix: 'custom',
        width: 20,
        height: 10,
        icons: { shape: { body: '<path d="M1 1h4v4H1z"/>' } },
        aliases: { test: { parent: 'shape', rotate: 1 }, same: { parent: 'test', hFlip: true } },
      },
      ['test', 'same'],
    );
  });
  await expect(page.locator('t-icon svg')).toHaveAttribute('viewBox', '5 -5 10 20');
  await expect(page.locator('t-icon svg g[transform]')).toHaveAttribute(
    'transform',
    'rotate(90 10 5)',
  );
  await page.evaluate(() => {
    const element = document.querySelector('t-icon')!;
    element.remove();
    (window as any).iconAPI.registerIcon('custom:test', {
      width: 24,
      height: 24,
      body: '<circle cx="12" cy="12" r="8"/>',
    });
    document.querySelector('#fixture')!.append(element);
  });
  await expect(page.locator('t-icon circle')).toHaveCount(1);
  await page.evaluate(() => (window as any).iconAPI.unregisterIcon('custom:test'));
  await expect(page.locator('t-icon svg')).not.toHaveAttribute('data-provider', '');
});
test('unsafe SVG, remote resources and invalid aliases cannot enter the registry', async ({
  page,
}) => {
  await mount(page, '', true);
  const accepted = await page.evaluate(() => {
    const api = (window as any).iconAPI;
    const invalid = [
      '<svg><script>alert(1)</script></svg>',
      '<svg onload="alert(1)"><path/></svg>',
      '<svg><foreignObject><div>unsafe</div></foreignObject></svg>',
      '<svg><use href="https://example.invalid/asset.svg#icon"/></svg>',
      '<svg><path fill="url(https://example.invalid/a)"/></svg>',
      '<svg><path style="background:url(https://example.invalid/a)"/></svg>',
      '<svg><path fill="var(--external-paint)"/></svg>',
      '<svg><path fill="u\\72l(https://example.invalid/a)"/></svg>',
      '<svg><animate attributeName="opacity"/></svg>',
      '<svg viewBox="0 0 -1 3"/>',
      'data:text/html,<script>alert(1)</script>',
      '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///example">]><svg>&x;</svg>',
    ];
    const passed = invalid.filter((svg) => {
      try {
        api.registerIcon('bad', svg);
        return true;
      } catch {
        return false;
      }
    });
    try {
      api.registerIconSet({
        prefix: 'bad',
        icons: {},
        aliases: { a: { parent: 'b' }, b: { parent: 'a' } },
      });
      passed.push('circularalias');
    } catch {}
    return passed;
  });
  expect(accepted).toEqual([]);
});
test('SVG encoding, root styles and local references are preserved without external loading', async ({
  page,
}) => {
  await mount(page, '<t-icon name="test:encoded" label="Encoded"></t-icon>', true);
  await page.evaluate(() => {
    const svg =
      '<svg viewBox="-2 -3 28 30" fill="none" stroke="currentColor"><defs><clipPath id="clip"><rect width="24" height="24"/></clipPath></defs><path clip-path="url(#clip)" style="stroke-width:2;stroke-linecap:round" d="M1 1h4"/></svg>';
    const api = (window as any).iconAPI;
    api.registerIcon('test:encoded', 'data:image/svg+xml,' + encodeURIComponent(svg));
    api.registerIcon('test:base64', 'data:image/svg+xml;base64,' + btoa(svg));
  });
  await expect(page.locator('t-icon svg')).toHaveAttribute('viewBox', '-2 -3 28 30');
  await expect(page.locator('t-icon svg path')).toHaveAttribute('clip-path', 'url(#clip)');
  await expect(page.locator('t-icon svg path')).toHaveAttribute('stroke-linecap', 'round');
});
for (const preference of ['normal', 'off', 'reduce'] as const)
  test(`motion ${preference}: controls, loading and overlays follow preferences`, async ({
    page,
  }) => {
    if (preference === 'reduce') await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(
      page,
      `<section id="scope" data-motion="${preference === 'off' ? 'off' : 'auto'}" style="--t-motion-fast:123ms"><t-button>Action</t-button><t-button loading>Saving</t-button><t-spinner></t-spinner><t-skeleton animated></t-skeleton><t-progress label="Working"></t-progress><t-checkbox switch label="Enable" checked></t-checkbox><t-toast open message="Saved"></t-toast><t-dialog heading="Settings"><t-input label="Name"></t-input></t-dialog></section>`,
    );
    await page.locator('t-dialog').evaluate((el: import('../src').TDialog) => el.show());
    const targets = [
      't-spinner .ring',
      't-button .spinner',
      't-skeleton span',
      't-progress progress',
      't-toast .notice',
      't-dialog dialog',
    ];
    for (const target of targets) {
      const style = await page.locator(target).evaluate((el) => ({
        name: getComputedStyle(el).animationName,
        duration: getComputedStyle(el).animationDuration,
      }));
      if (preference === 'normal') expect(style.name).not.toBe('none');
      else expect(style.name).toBe('none');
    }
    const duration = await page
      .locator('t-button button')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration.split(',').every((v) => parseFloat(v) === 0)).toBe(preference !== 'normal');
    // No artificial close delay: semantics, focus and lifecycle remain immediate.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
test('local motion reset enables a child and device preference still has final control', async ({
  page,
}) => {
  await mount(
    page,
    '<section data-motion="off"><t-spinner id="off"></t-spinner><section data-motion="auto"><t-spinner id="auto"></t-spinner></section></section>',
  );
  await expect(page.locator('#off .ring')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('#auto .ring')).toHaveCSS('animation-name', 'rotate');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#auto .ring')).toHaveCSS('animation-name', 'none');
});
test('copy button reports success only after clipboard completion and reports denial', async ({
  page,
}) => {
  await mount(page, '<t-copy-button value="Launch sequence" label="Copy command"></t-copy-button>');
  await page.evaluate(() => {
    (window as any).copied = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as any).copied.push(value);
        },
      },
    });
  });
  await page.getByRole('button', { name: 'Copy command' }).click();
  await expect(page.getByRole('status')).toHaveText('Copied to clipboard.');
  expect(await page.evaluate(() => (window as any).copied)).toEqual(['Launch sequence']);
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error('Denied');
    };
  });
  await page.getByRole('button', { name: 'Copy command' }).click();
  await expect(page.getByRole('status')).toContainText('Could not copy.');
});

test('copy button retains focus while pending, ignores duplicate activation and respects disabled state', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await mount(
    page,
    '<t-copy-button label="Copy a very long status command for this workspace" value="status"></t-copy-button>',
  );
  await page.evaluate(() => {
    (window as any).writes = 0;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => {
          (window as any).writes++;
          return new Promise<void>((resolve) => {
            (window as any).finishCopy = resolve;
          });
        },
      },
    });
  });
  const button = page.getByRole('button');
  await button.focus();
  await button.press('Enter');
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await expect(button).toBeFocused();
  await button.press('Enter');
  expect(await page.evaluate(() => (window as any).writes)).toBe(1);
  await expect(page.getByRole('status')).toBeEmpty();
  await page.evaluate(() => (window as any).finishCopy());
  await expect(page.getByRole('status')).toHaveText('Copied to clipboard.');
  await page.locator('t-copy-button').evaluate((el: import('../src').TCopyButton) => {
    el.disabled = true;
  });
  await expect(button).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
