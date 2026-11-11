import React from 'react';
import { Markdown, Primary, Source, Stories, Title } from '@storybook/addon-docs/blocks';
import { FrameworkSelector, useFramework } from './ComponentDocs';
import { frameworks } from './examples';
import guide from '../../docs/image-effects.md?raw';

const examples = {
  html: `<!-- Copy dist/themes.css and dist/image-effects.css to /assets. -->
<link rel="stylesheet" href="/assets/themes.css">
<link rel="stylesheet" href="/assets/image-effects.css">
<span class="t-image-effect" data-image-scanlines="subtle" data-image-tint>
  <img id="portrait" src="/portrait.jpg" alt="Portrait of the spacecraft pilot">
</span>
<script type="module">
  // Copy dist/effects/ascii.js and dist/effects/shared.js to /assets/effects.
  import { mountAscii } from '/assets/effects/ascii.js';
  const effect = mountAscii(document.querySelector('#portrait'));
  // Call effect.destroy() when this view is removed.
</script>`,
  angular: `// Add @import '@joelmeaders/terminalui/themes.css'; and
// @import '@joelmeaders/terminalui/image-effects.css'; to src/styles.css.
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { mountAscii, type ImageEffectController, type AsciiOptions } from '@joelmeaders/terminalui/image-ascii';

@Component({
  selector: 'app-portrait',
  standalone: true,
  template: \`<span class="t-image-effect" data-image-scanlines="subtle" data-image-tint>
    <img #portrait src="/portrait.jpg" alt="Portrait of the spacecraft pilot">
  </span>\`,
})
export class Portrait implements AfterViewInit, OnDestroy {
  @ViewChild('portrait', { static: true }) portrait!: ElementRef<HTMLImageElement>;
  private effect?: ImageEffectController<AsciiOptions>;
  ngAfterViewInit() { this.effect = mountAscii(this.portrait.nativeElement); }
  ngOnDestroy() { this.effect?.destroy(); }
}`,
  vue: `<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import '@joelmeaders/terminalui/themes.css';
import '@joelmeaders/terminalui/image-effects.css';
import { mountAscii } from '@joelmeaders/terminalui/image-ascii';

const portrait = ref<HTMLImageElement | null>(null);
let effect: ReturnType<typeof mountAscii> | undefined;
onMounted(() => { if (portrait.value) effect = mountAscii(portrait.value); });
onBeforeUnmount(() => effect?.destroy());
</script>
<template>
  <span class="t-image-effect" data-image-scanlines="subtle" data-image-tint>
    <img ref="portrait" src="/portrait.jpg" alt="Portrait of the spacecraft pilot" />
  </span>
</template>`,
  react: `import { useEffect, useRef } from 'react';
import '@joelmeaders/terminalui/themes.css';
import '@joelmeaders/terminalui/image-effects.css';
import { mountAscii } from '@joelmeaders/terminalui/image-ascii';

export function Portrait() {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!image.current) return;
    const effect = mountAscii(image.current);
    return () => effect.destroy();
  }, []);
  return <span className="t-image-effect" data-image-scanlines="subtle" data-image-tint>
    <img ref={image} src="/portrait.jpg" alt="Portrait of the spacecraft pilot" />
  </span>;
}`,
};

export function ImageEffectsDocs() {
  const [framework, updateFramework] = useFramework();
  return (
    <article className="tk-docs" data-docs-framework={framework}>
      <div className="tk-docs-topline">
        <span>TERMINAL / KIT · IMAGE EFFECTS</span>
        <FrameworkSelector framework={framework} onChange={updateFramework} />
      </div>
      <header className="tk-docs-hero">
        <Title />
        <p className="tk-docs-lead">Optional terminal treatments for native images.</p>
      </header>
      <nav className="tk-docs-nav" aria-label="On this documentation page">
        <a href="#getting-started" target="_self">
          Get started
        </a>
        <a href="#live-preview" target="_self">
          Try it
        </a>
        <a href="#image-guide" target="_self">
          Options and accessibility
        </a>
        <a href="#states" target="_self">
          Examples
        </a>
      </nav>
      <section id="getting-started">
        <h2>Get started with {frameworks[framework]}</h2>
        <p>Import the CSS once. The optional runtime module processes only images you mount.</p>
        <div data-testid="image-example">
          <Source
            code={examples[framework]}
            language={
              framework === 'react' ? 'tsx' : framework === 'angular' ? 'typescript' : 'html'
            }
            dark
          />
        </div>
      </section>
      <section id="live-preview">
        <h2>Try it</h2>
        <p>The preview uses native HTML. Change the palette with the toolbar.</p>
        <Primary />
      </section>
      <section id="image-guide">
        <Markdown>{guide.replace(/^# .+\n/, '')}</Markdown>
      </section>
      <section id="states">
        <h2>Examples</h2>
        <Stories includePrimary={false} />
      </section>
    </article>
  );
}
