import React, { useContext, useEffect, useState } from 'react';
import {
  Controls,
  Description,
  DocsContext,
  Markdown,
  Primary,
  Source,
  Stories,
  Title,
} from '@storybook/addon-docs/blocks';
import { GLOBALS_UPDATED, UPDATE_GLOBALS } from 'storybook/internal/core-events';
import {
  apiFor,
  exampleCss,
  exampleFor,
  frameworks,
  type ApiMember,
  type ComponentApi,
  type Framework,
} from './examples';
import { guides } from './catalog';
import frameworkGuide from '../../docs/frameworks.md?raw';
import iconGuide from '../../docs/icons.md?raw';
import spinnerGuide from '../../docs/spinners.md?raw';
import slotGuide from '../../docs/slots.md?raw';
import appearanceGuide from '../../docs/appearance.md?raw';
import accessibilityGuide from '../../docs/accessibility.md?raw';
import { icons } from '../../src/components/icon';
import './docs.css';

const frameworkValue = (value: unknown): Framework =>
  typeof value === 'string' && Object.hasOwn(frameworks, value) ? (value as Framework) : 'html';
const manualEvidence = accessibilityGuide
  .slice(accessibilityGuide.indexOf('## Manual evidence register'))
  .split(/(^\|[^\r\n]*(?:\r?\n\|[^\r\n]*)+)/m);
export function useFramework() {
  const context = useContext(DocsContext);
  const story = context.componentStories()[0];
  const [framework, setFramework] = useState(() =>
    frameworkValue(context.getStoryContext(story).globals.framework),
  );
  useEffect(() => {
    setFramework(frameworkValue(context.getStoryContext(story).globals.framework));
    const changed = ({ globals }: { globals: Record<string, unknown> }) =>
      setFramework(frameworkValue(globals.framework));
    context.channel.on(GLOBALS_UPDATED, changed);
    return () => {
      context.channel.off(GLOBALS_UPDATED, changed);
    };
  }, [context, story]);
  const update = (value: Framework) =>
    context.channel.emit(UPDATE_GLOBALS, { globals: { framework: value } });
  return [framework, update] as const;
}

export function FrameworkSelector({
  framework,
  onChange,
}: {
  framework: Framework;
  onChange: (value: Framework) => void;
}) {
  return (
    <label>
      Code examples
      <select
        aria-label="Documentation framework"
        value={framework}
        onChange={(event) => onChange(frameworkValue(event.target.value))}
      >
        {Object.entries(frameworks).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

const commonDescriptions: Record<string, string> = {
  label: 'Visible label or accessible name for the component.',
  name: 'Field name used for native form submission.',
  value: 'Current value. Programmatic changes update the view without emitting input.',
  checked: 'Boolean selection state.',
  disabled: 'Prevents user interaction. Disabled form fields are omitted from FormData.',
  required: 'Requires a valid value for native form submission.',
  error: 'Application error text, associated with the native control.',
  help: 'Instructions associated with the native control.',
  invalid: 'Marks the field as invalid. Supply useful error text as well.',
  placeholder: 'Optional entry hint. Does not replace the label.',
  readonly: 'Prevents editing while preserving reading and form submission.',
  open: 'Controls whether the content is shown.',
  variant: 'Semantic appearance. Use the state examples below for supported choices.',
  size: 'Component size. Compare available sizes in the state examples.',
  heading: 'Visible heading for the content.',
  form: 'Associated native form (read only).',
  validity: 'Native ValidityState (read only).',
  validationMessage: 'Current native validation message (read only).',
  willValidate: 'Whether the field participates in constraint validation (read only).',
  autocomplete: 'Native browser autofill hint.',
  minlength: 'Minimum text length.',
  maxlength: 'Maximum text length.',
  min: 'Lower bound.',
  max: 'Upper bound.',
  step: 'Allowed increment.',
  pattern: 'Native regular-expression constraint.',
};
const lifecycle = new Set([
  'render',
  'updated',
  'firstUpdated',
  'willUpdate',
  'connectedCallback',
  'disconnectedCallback',
  'formDisabledCallback',
  'formResetCallback',
  'formStateRestoreCallback',
]);
const publicMembers = (api: ComponentApi, kind: string) =>
  api.members.filter(
    (m) =>
      m.kind === kind &&
      !m.static &&
      m.privacy !== 'private' &&
      m.privacy !== 'protected' &&
      !lifecycle.has(m.name),
  );
function ApiTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: React.ReactNode[][];
}) {
  if (!rows.length)
    return <p className="tk-docs-empty">No component-specific {title.toLowerCase()}.</p>;
  return (
    <div
      className="tk-docs-table"
      role="region"
      aria-label={title}
      aria-describedby="api-table-scroll-help"
      tabIndex={0}
    >
      <table>
        <caption>{title}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const code = (value?: string) => (value ? <code>{value}</code> : '—');
const signature = (member: ApiMember) =>
  `${member.name}(${(member.parameters ?? []).map((p) => `${p.name}${p.optional || p.default ? '?' : ''}: ${p.type?.text ?? 'unknown'}`).join(', ')})`;
function ApiReference({ api }: { api: ComponentApi }) {
  return (
    <section id="api-reference">
      <h2>API reference</h2>
      <p>
        This reference is generated from the component source, including inherited form behavior.
        Attribute names and JavaScript properties can differ.
      </p>
      <p id="api-table-scroll-help" className="tk-docs-table-hint">
        At narrow widths, focus a table and use the left and right arrow keys to read every column.
      </p>
      <ApiTable
        title="Properties and attributes"
        columns={['Property', 'HTML attribute', 'Type / default', 'Description']}
        rows={publicMembers(api, 'field').map((m) => [
          code(m.name),
          code(api.attributes.find((a) => a.fieldName === m.name)?.name) === '—'
            ? 'Property only'
            : code(api.attributes.find((a) => a.fieldName === m.name)?.name),
          <>
            {code(m.type?.text)}
            <br />
            {m.default ? (
              <small>Default: {code(m.default)}</small>
            ) : (
              <small>No declared default</small>
            )}
          </>,
          m.description ||
            (m.name === 'name' && api.tagName.startsWith('t-icon')
              ? 'Built-in or registered icon key, such as search or app:check.'
              : m.name === 'name' && api.tagName === 't-avatar'
                ? 'Person name used for the accessible identity and initials.'
                : commonDescriptions[m.name]) ||
            `${m.name.replace(/([A-Z])/g, ' $1').toLowerCase()} setting. See usage and state examples.`,
        ])}
      />
      <h3>Events</h3>
      <ApiTable
        title="Events"
        columns={['Event', 'Detail / behavior']}
        rows={api.events.map((event) => [
          code(event.name),
          event.description ||
            (event.name === 'input' || event.name === 'change'
              ? 'Bubbling, composed native event. Read the public value, checked, or files property on event.target.'
              : guides[api.tagName]?.event?.name === event.name
                ? guides[api.tagName].event!.description
                : api.description || event.type?.text || 'Custom event.'),
        ])}
      />
      <p>
        Native DOM events, such as click and focus, remain available. Custom events bubble across
        shadow boundaries. React wrapper event names use camel case, such as onTSelect.
      </p>
      <h3>Methods</h3>
      <ApiTable
        title="Methods"
        columns={['Signature', 'Description']}
        rows={publicMembers(api, 'method').map((m) => [
          code(signature(m)),
          m.description ||
            (
              {
                focus: 'Moves focus to the internal interactive control.',
                show: 'Opens the component. Pass the opener when focus restoration needs an explicit target.',
                close: 'Closes the component and runs its normal dismissal behavior.',
                setCustomValidity:
                  'Set an application validation message. Use an empty string to clear it.',
                checkValidity: 'Returns whether the current value is valid.',
                reportValidity: 'Checks validity and shows native validation feedback.',
                stepUp: 'Increases the numeric value within bounds.',
                stepDown: 'Decreases the numeric value within bounds.',
                addTag: 'Adds a unique, nonempty tag when limits permit.',
                removeTag: 'Removes the matching tag.',
              } as Record<string, string>
            )[m.name] ||
            'Call on the custom element instance.',
        ])}
      />
      <h3>Slots</h3>
      <ApiTable
        title="Slots"
        columns={['Slot', 'Content']}
        rows={api.slots.map((slot) => [code(slot.name || '(default)'), slot.description])}
      />
      {api.tagName === 't-tabs' && (
        <p>Tab panels use dynamic slot names: each panel slot must match a tabs item ID.</p>
      )}
      {api.slots.length > 0 && (
        <details className="tk-docs-setup">
          <summary>Composing with slots and icons</summary>
          <Markdown>{slotGuide.replace(/^# .+\n/, '')}</Markdown>
        </details>
      )}
    </section>
  );
}

function FrameworkSetup({ framework }: { framework: Framework }) {
  const heading = { html: 'Plain HTML', react: 'React 19', vue: 'Vue 3', angular: 'Angular 22' }[
    framework
  ];
  const intro = frameworkGuide.slice(
    frameworkGuide.indexOf('\n') + 1,
    frameworkGuide.indexOf('## Plain HTML'),
  );
  const start = frameworkGuide.indexOf(`## ${heading}`);
  const next = frameworkGuide.indexOf('\n## ', start + 1);
  return (
    <details className="tk-docs-setup">
      <summary>Project setup for {frameworks[framework]}</summary>
      <Markdown>{intro + frameworkGuide.slice(start, next < 0 ? undefined : next)}</Markdown>
      {framework === 'angular' && (
        <>
          <p>
            Load the shared theme in the application entry point or global stylesheet, not in
            component-scoped styles:
          </p>
          <Source code="import '@terminal-kit/core/themes.css';" language="typescript" />
        </>
      )}
    </details>
  );
}

export function ComponentDocs() {
  const context = useContext(DocsContext);
  const primary = context.componentStories()[0];
  const tag = typeof primary?.component === 'string' ? primary.component : '';
  const api = apiFor(tag);
  const isAppearance = primary?.title === 'Introduction/Appearance';
  const isIntroduction = primary?.title === 'Introduction/Start here';
  const guide = guides[tag];
  const [framework, updateFramework] = useFramework();
  const example = guide ? exampleFor(tag, framework) : undefined;
  const languages = { html: 'html', react: 'tsx', vue: 'html', angular: 'typescript' } as const;
  return (
    <article className="tk-docs" data-docs-framework={framework}>
      <div className="tk-docs-topline">
        <span>TERMINAL / KIT · COMPONENT MANUAL</span>
        <FrameworkSelector framework={framework} onChange={updateFramework} />
      </div>
      <header className="tk-docs-hero">
        <Title />
        {api && <code className="tk-docs-tag">&lt;{api.tagName}&gt;</code>}
        {guide ? <p className="tk-docs-lead">{guide.purpose}</p> : <Description />}
      </header>
      <nav className="tk-docs-nav" aria-label="On this documentation page">
        <a href="#getting-started" target="_self">
          Get started
        </a>
        <a href="#live-preview" target="_self">
          Try it
        </a>
        {isAppearance && (
          <a href="#appearance-guide" target="_self">
            Inheritance
          </a>
        )}
        {isIntroduction && (
          <a href="#manual-accessibility" target="_self">
            Manual accessibility review
          </a>
        )}
        {api && (
          <>
            <a href="#api-reference" target="_self">
              API
            </a>
            <a href="#styling" target="_self">
              Styling
            </a>
            <a href="#accessibility" target="_self">
              Accessibility
            </a>
          </>
        )}
        <a href="#states" target="_self">
          States
        </a>
      </nav>
      <section id="getting-started">
        <h2>Get started with {frameworks[framework]}</h2>
        <p>
          The framework setting follows you between pages and also appears in the Storybook toolbar.
          Examples use the same browser components.
        </p>
        <FrameworkSetup framework={framework} />
        {guide && (
          <>
            <h3>Usage</h3>
            <ul>
              {guide.usage.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p>
              Copy this starting example into your application after project setup. Array and object
              inputs are assigned as properties.
            </p>
            <div data-testid="framework-example">
              <Source code={example} language={languages[framework]} dark />
            </div>
            {framework === 'react' && (
              <>
                <p>
                  Save this shared styling as <code>example.css</code> beside the example:
                </p>
                <Source code={exampleCss} language="css" />
              </>
            )}
            {guide.event && (
              <p className="tk-docs-note">
                <strong>Handle the result.</strong> {guide.event.description}
              </p>
            )}
            {guide.form && (
              <p className="tk-docs-note">
                Native forms submit this field under its name. React and Vue examples bind component
                state. Angular examples use the value accessor. Browser validity and framework
                validation are separate; configure both when your application requires both.
              </p>
            )}
          </>
        )}
      </section>
      {isAppearance && (
        <section id="appearance-guide">
          <h2>Cascading appearance</h2>
          <Markdown>{appearanceGuide.replace(/^# .+\n/, '')}</Markdown>
        </section>
      )}
      {isIntroduction && (
        <section id="manual-accessibility">
          <h2>Manual accessibility review</h2>
          <p>
            Automated checks cover browser behavior. Manual NVDA, VoiceOver, physical touch, and
            real OS preference checks remain pending. The library does not claim WCAG conformance.
          </p>
          <details>
            <summary>Manual test setup and scenarios</summary>
            <Markdown>
              {accessibilityGuide.slice(
                accessibilityGuide.indexOf('## Test setup and records'),
                accessibilityGuide.indexOf('## Manual evidence register'),
              )}
            </Markdown>
          </details>
          <details>
            <summary>Results and unresolved review items</summary>
            <Markdown>{manualEvidence[0]}</Markdown>
            <div
              className="tk-docs-table"
              role="region"
              aria-label="Manual accessibility evidence and review items"
              tabIndex={0}
            >
              <Markdown>{manualEvidence[1]}</Markdown>
            </div>
            <Markdown>{manualEvidence[2]}</Markdown>
          </details>
        </section>
      )}
      {guide?.guide === 'icons' && (
        <section id="icon-registration">
          <h2>Register and import icons</h2>
          <p>
            The registry setup is shared by HTML, Angular, Vue, and React. Run it once in a browser
            module before rendering your application. Use the framework example above for the
            component binding.
          </p>
          <details>
            <summary>Built-in icon names · no provider registration needed</summary>
            <p className="tk-docs-icon-names">
              {Object.keys(icons).map((name) => (
                <code key={name}>{name}</code>
              ))}
            </p>
          </details>
          <Markdown>{iconGuide.replace(/^# .+\n/, '')}</Markdown>
        </section>
      )}
      {guide?.guide === 'spinners' && (
        <details>
          <summary>Spinner styles and motion guide</summary>
          <Markdown>{spinnerGuide.replace(/^# .+\n/, '')}</Markdown>
        </details>
      )}
      <section id="live-preview">
        <h2>Try it</h2>
        <p>
          The preview renders the shared Web Component. Controls update this preview; the starting
          example above remains a complete integration recipe.
        </p>
        <Primary />
        <p className="tk-docs-controls-hint">
          Scroll the controls table sideways to reach every column.
        </p>
        <div
          className="tk-docs-controls"
          role="region"
          aria-label="Live preview controls"
          tabIndex={0}
        >
          <Controls
            include={
              api
                ? [
                    ...api.attributes.map((attribute) => attribute.name),
                    ...publicMembers(api, 'field')
                      .filter((member) => !member.readonly && member.default !== undefined)
                      .map((member) => member.name),
                  ]
                : undefined
            }
          />
        </div>
      </section>
      {api && (
        <>
          <ApiReference api={api} />
          <section id="styling">
            <h2>Styling</h2>
            <p>
              Import themes.css once. Set appearance attributes on html, body, or a parent region.
              The nearest override of each setting wins. Use the toolbar to compare all six
              palettes, density, line weight, glow, scanlines, and motion.
            </p>
            <Source
              code={
                '<section data-theme="phosphor" data-lines="bold" data-motion="auto">\n  <!-- Components inherit these settings. -->\n</section>\n\n<style>\n  /* Shared spacing applies through shadow roots. */\n  section { --t-space: 20px; }\n</style>'
              }
              language="html"
            />
            <details>
              <summary>Cascading appearance settings</summary>
              <Markdown>{appearanceGuide.replace(/^# .+\n/, '')}</Markdown>
            </details>
            <ApiTable
              title="CSS parts"
              columns={['Part', 'Target']}
              rows={api.cssParts.map((part) => [code(part.name), part.description])}
            />
            {api.cssParts[0] && (
              <Source
                code={`${tag}::part(${api.cssParts[0].name}) {\n  /* Add an application-specific style to this documented target. */\n}`}
                language="css"
              />
            )}
            <ApiTable
              title="Component CSS properties"
              columns={['Custom property', 'Purpose']}
              rows={api.cssProperties.map((property) => [
                code(property.name),
                property.description,
              ])}
            />
            <p>
              Shared tokens include --t-accent, --t-text, --t-bg, --t-surface, --t-control-border,
              --t-focus, --t-font, and --t-space. Variables beginning with --_t- are internal.
              Recheck contrast after overrides.
            </p>
          </section>
          <section id="accessibility">
            <h2>Accessibility and behavior</h2>
            <ul>
              {guide?.accessibility.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p>
              Reduced-motion preferences override decorative animation. Keyboard access, focus, and
              validation do not wait for an animation. Automated checks cover representative states;
              manual NVDA and VoiceOver validation remains pending.
            </p>
          </section>
        </>
      )}
      <section id="states">
        <h2>States and examples</h2>
        <p>
          These stories exercise the same component in different states. Their preview source uses
          Web Component markup.
        </p>
        <Stories title="Examples" />
      </section>
    </article>
  );
}
