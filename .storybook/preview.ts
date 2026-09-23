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
    lines: {
      description: 'Border and divider weight',
      toolbar: { title: 'Lines', icon: 'outline', items: ['standard', 'bold'], dynamicTitle: true },
    },
    glow: {
      description: 'Phosphor glow',
      toolbar: {
        title: 'Glow',
        icon: 'sun',
        items: ['off', 'subtle', 'strong'],
        dynamicTitle: true,
      },
    },
    scanlines: {
      description: 'Scanlines on the story screen',
      toolbar: {
        title: 'Scanlines',
        icon: 'listunordered',
        items: ['off', 'subtle', 'pronounced'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'amber',
    density: 'comfortable',
    lines: 'standard',
    glow: 'off',
    scanlines: 'off',
  },
  decorators: [
    (story, context) =>
      html`<div
        class="t-screen"
        data-theme=${context.globals.theme}
        data-density=${context.globals.density}
        data-lines=${context.globals.lines}
        data-glow=${context.globals.glow}
        data-scanlines=${context.globals.scanlines}
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
