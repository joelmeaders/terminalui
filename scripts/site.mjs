import { cp } from 'node:fs/promises';
await cp('storybook-static', 'demo-dist/storybook', { recursive: true });
console.log('Combined demo and Storybook are ready in demo-dist/.');
