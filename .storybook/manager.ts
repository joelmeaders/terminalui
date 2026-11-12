import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';
addons.setConfig({
  theme: create({
    base: 'dark',
    brandTitle: 'HULLFRAME',
    colorPrimary: '#f5ba5b',
    colorSecondary: '#f5ba5b',
    appBg: '#121411',
    appContentBg: '#191d18',
    appBorderColor: '#59614e',
    textColor: '#eee9d9',
    barBg: '#191d18',
    fontBase: 'Consolas, monospace',
  }),
});
