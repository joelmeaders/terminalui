import type { Preview } from '@storybook/web-components-vite';
import { html } from 'lit';
import { themes } from 'storybook/theming';
import '../src/index';
import '../src/themes.css';
const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper'],
        dynamicTitle: true,
      },
    },
    density: {
      description: 'Control density',
      toolbar: {
        title: 'Density',
        icon: 'component',
        items: ['comfortable', 'compact'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'amber', density: 'comfortable' },
  decorators: [
    (story, context) =>
      html`<div
        data-theme=${context.globals.theme}
        data-density=${context.globals.density}
        style="padding:32px;min-height:160px;background:var(--t-bg);color:var(--t-text);font:14px/1.6 var(--t-font)"
      >
        ${story()}
      </div>`,
  ],
  parameters: {
    docs: { theme: themes.dark },
    layout: 'padded',
    a11y: { test: 'error' },
    controls: { expanded: true },
    options: { storySort: { order: ['Introduction', 'Components', 'Patterns'] } },
  },
};
export default preview;
