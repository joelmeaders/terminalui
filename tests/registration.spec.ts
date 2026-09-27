import { readdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const components = readdirSync(new URL('../src/components/', import.meta.url))
  .filter((name) => name.endsWith('.ts'))
  .map((name) => name.slice(0, -3));

test('every component tolerates repeated module evaluation and preserves registered instances', async ({
  page,
}) => {
  await page.route('**/@vite/client', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' }),
  );
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  const results = await page.evaluate(async (names) => {
    const results = [];
    for (const name of names) {
      const tag = `t-${name}`;
      await import(`/src/components/${name}.ts`);
      const registered = customElements.get(tag);
      const instance = document.createElement(tag) as HTMLElement & {
        updateComplete: Promise<unknown>;
      };
      document.querySelector('#fixture')!.append(instance);
      await instance.updateComplete;
      await import(`/src/components/${name}.ts?registration-repeat=1`);
      await import(`/src/components/${name}.ts?registration-repeat=2`);
      results.push({
        tag,
        stable: registered === customElements.get(tag),
        instancePreserved: instance.constructor === registered,
        rendered: !!instance.shadowRoot?.childNodes.length,
      });
      instance.remove();
    }
    return results;
  }, components);
  expect(results).toHaveLength(components.length);
  expect(results.length).toBeGreaterThan(0);
  for (const result of results)
    expect(result).toEqual({
      tag: result.tag,
      stable: true,
      instancePreserved: true,
      rendered: true,
    });
});
