import { chromium, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

declare const chrome: {
  tabs: {
    query(options: { url: string }): Promise<{ id?: number; url?: string }[]>;
    setZoom(tabId: number, zoomFactor: number): Promise<void>;
    getZoom(tabId: number): Promise<number>;
  };
};

export async function launchBrowserZoom(
  testInfo: TestInfo,
  baseURL: string,
  viewport: { width: number; height: number },
) {
  const extensionPath = testInfo.outputPath('zoom-extension');
  await mkdir(extensionPath, { recursive: true });
  await writeFile(
    `${extensionPath}/manifest.json`,
    JSON.stringify({
      manifest_version: 3,
      name: 'Isolated accessibility zoom test',
      version: '1.0.0',
      permissions: ['tabs'],
      host_permissions: ['http://127.0.0.1/*'],
      background: { service_worker: 'background.js' },
    }),
  );
  await writeFile(
    `${extensionPath}/background.js`,
    'chrome.runtime.onInstalled.addListener(() => {});',
  );
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    baseURL,
    viewport,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  const page = await context.newPage();
  return {
    context,
    page,
    async setZoom(factor: number) {
      const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
      const targetUrl = page.url();
      return worker.evaluate(
        async ({ factor, targetUrl }) => {
          const tabs = await chrome.tabs.query({ url: 'http://127.0.0.1/*' });
          const tab = tabs.find((item) => item.url === targetUrl);
          if (!tab?.id) throw new Error('Target tab was not found by the zoom extension');
          await chrome.tabs.setZoom(tab.id, factor);
          return chrome.tabs.getZoom(tab.id);
        },
        { factor, targetUrl },
      );
    },
  };
}
