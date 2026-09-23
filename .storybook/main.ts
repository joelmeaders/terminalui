import type { StorybookConfig } from '@storybook/web-components-vite';
const config: StorybookConfig = {
  framework: '@storybook/web-components-vite',
  stories: ['../stories/**/*.stories.ts'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  core: { disableTelemetry: true },
  async viteFinal(config) {
    // Keep renderer and story imports on the same native Lit modules in development.
    config.optimizeDeps = {
      ...config.optimizeDeps,
      exclude: [
        ...(config.optimizeDeps?.exclude ?? []),
        'lit',
        'lit-html',
        'lit-element',
        '@lit/reactive-element',
      ],
    };
    config.resolve = {
      ...config.resolve,
      dedupe: ['lit', 'lit-html', 'lit-element', '@lit/reactive-element'],
    };
    return config;
  },
};
export default config;
