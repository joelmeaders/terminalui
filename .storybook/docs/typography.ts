import { exampleCss, markup, type Framework } from './examples';
import type { ExampleNode } from './catalog';

/** One native HTML recipe supplies the preview and all four framework examples. */
export const typographyExample: ExampleNode = {
  tag: 'article',
  attrs: { class: 'example t-prose', 'data-theme': 'amber' },
  children: [
    { tag: 'p', attrs: { class: 't-eyebrow' }, children: ['Field manual / 01'] },
    { tag: 'h1', children: ['A clear signal.'] },
    {
      tag: 'p',
      attrs: { class: 't-lead' },
      children: ['Readable text for everyday interfaces, with a little terminal character.'],
    },
    {
      tag: 'p',
      children: [
        'Start with ',
        { tag: 'strong', children: ['semantic HTML'] },
        '. Use headings for structure and ',
        { tag: 'a', attrs: { href: '#reading-notes' }, children: ['links for navigation'] },
        '.',
      ],
    },
    { tag: 'h2', attrs: { id: 'reading-notes' }, children: ['Reading notes'] },
    {
      tag: 'ul',
      children: [
        { tag: 'li', children: ['Keep one clear title for the page.'] },
        {
          tag: 'li',
          children: [
            'Use ',
            { tag: 'code', children: ['.t-prose'] },
            ' for a region of formatted content.',
          ],
        },
      ],
    },
    {
      tag: 'blockquote',
      children: [{ tag: 'p', children: ['Good information stays readable in every palette.'] }],
    },
    {
      tag: 'p',
      children: [
        'Press ',
        { tag: 'kbd', children: ['Tab'] },
        ' to reach the next link. ',
        { tag: 'mark', children: ['Keep the focus visible.'] },
      ],
    },
    {
      tag: 'p',
      attrs: { class: 't-muted t-text-small' },
      children: ['No font download or JavaScript is required for these text styles.'],
    },
  ],
};

export function typographyExampleFor(framework: Framework): string {
  const content = markup(typographyExample, framework, false);
  if (framework === 'html')
    return `<!-- Copy dist/themes.css and dist/typography.css to /assets. No script is needed. -->
<link rel="stylesheet" href="/assets/themes.css">
<link rel="stylesheet" href="/assets/typography.css">
<style>\n${exampleCss}\n</style>
${content}`;
  if (framework === 'react')
    return `import '@joelmeaders/hullframe/themes.css';
import '@joelmeaders/hullframe/typography.css';
import './example.css';

export function Example() {
  return (\n${content}\n  );
}`;
  if (framework === 'vue')
    return `<script setup lang="ts">
import '@joelmeaders/hullframe/themes.css';
import '@joelmeaders/hullframe/typography.css';
</script>

<template>\n${content}\n</template>

<style>\n${exampleCss}\n</style>`;
  return `// In src/styles.css, before other styles:
// @import '@joelmeaders/hullframe/themes.css';
// @import '@joelmeaders/hullframe/typography.css';
import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  standalone: true,
  template: ${JSON.stringify(content)},
  styles: [${JSON.stringify(exampleCss)}],
})
export class Example {}`;
}
