import React from 'react';
import { Controls, Markdown, Primary, Source, Stories, Title } from '@storybook/addon-docs/blocks';
import { FrameworkSelector, useFramework } from './ComponentDocs';
import { exampleCss, frameworks } from './examples';
import { typographyExampleFor } from './typography';
import guide from '../../docs/typography.md?raw';
import appearanceGuide from '../../docs/appearance.md?raw';

export function TypographyDocs() {
  const [framework, updateFramework] = useFramework();
  return (
    <article className="tk-docs" data-docs-framework={framework}>
      <div className="tk-docs-topline">
        <span>TERMINAL / KIT · TYPOGRAPHY</span>
        <FrameworkSelector framework={framework} onChange={updateFramework} />
      </div>
      <header className="tk-docs-hero">
        <Title />
        <p className="tk-docs-lead">Native text. Clear hierarchy. Every palette.</p>
      </header>
      <nav className="tk-docs-nav" aria-label="On this documentation page">
        <a href="#getting-started" target="_self">
          Get started
        </a>
        <a href="#live-preview" target="_self">
          Try it
        </a>
        <a href="#typography-guide" target="_self">
          Styles and tokens
        </a>
        <a href="#states" target="_self">
          Examples
        </a>
      </nav>
      <section id="getting-started">
        <h2>Get started with {frameworks[framework]}</h2>
        <p>
          Import the themes and typography CSS once. These are native HTML elements, so typography
          needs no component registration or framework adapter.
        </p>
        <p>
          The global selector changes the complete integration code. The preview uses the same HTML
          and CSS in every framework.
        </p>
        <div data-testid="typography-example">
          <Source
            code={typographyExampleFor(framework)}
            language={
              framework === 'react' ? 'tsx' : framework === 'angular' ? 'typescript' : 'html'
            }
            dark
          />
        </div>
        {framework === 'react' && (
          <>
            <p>
              Save this as <code>example.css</code> beside the example:
            </p>
            <Source code={exampleCss} language="css" />
          </>
        )}
      </section>
      <section id="live-preview">
        <h2>Try it</h2>
        <p>
          Change the reading size or use the toolbar to compare palettes, line weight, and display
          effects.
        </p>
        <Primary />
        <p className="tk-docs-controls-hint">
          Scroll the controls table sideways to reach every column.
        </p>
        <div
          className="tk-docs-controls"
          role="region"
          aria-label="Typography controls"
          tabIndex={0}
        >
          <Controls />
        </div>
      </section>
      <section id="typography-guide">
        <Markdown>{guide.replace(/^# .+\n/, '')}</Markdown>
        <details>
          <summary>Cascading appearance settings</summary>
          <Markdown>{appearanceGuide.replace(/^# .+\n/, '')}</Markdown>
        </details>
      </section>
      <section id="states">
        <h2>Examples</h2>
        <Stories includePrimary={false} />
      </section>
    </article>
  );
}
