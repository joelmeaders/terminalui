import { expect, test } from '@playwright/test';
import type { AxeResults } from 'axe-core';
import { writeFile } from 'node:fs/promises';

/** Keep review items available even when an automated scan has no violations. */
export async function expectAxeReport(
  results: Pick<AxeResults, 'violations' | 'incomplete'>,
  name = 'axe-review',
) {
  const info = test.info();
  const path = info.outputPath(`${name}.json`);
  await writeFile(
    path,
    JSON.stringify({ violations: results.violations, incomplete: results.incomplete }, null, 2),
  );
  await info.attach(name, { path, contentType: 'application/json' });
  expect(results.violations, JSON.stringify(results.violations)).toEqual([]);
}
