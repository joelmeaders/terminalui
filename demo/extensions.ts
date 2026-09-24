import { html } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import type { TCommandPalette } from '../src';
import { providerExamples } from './icons';
const creditsUrl = import.meta.env.DEV
  ? '/docs/icon-licenses/index.html'
  : './icon-licenses/index.html';

let step = 'configure';
let saved = '';
let meterVariant = 'solid';
let meterSize = 'small';
let meterPreview = 0;
const steps = [
  { id: 'configure', label: 'Configure', description: 'Set mission preferences' },
  { id: 'review', label: 'Review', description: 'Check the local example' },
  { id: 'ready', label: 'Ready', description: 'Prepare for departure' },
];
const commands = [
  {
    value: 'themes',
    label: 'Choose a theme',
    description: 'Open appearance settings',
    keywords: ['color', 'palette'],
  },
  { value: 'forms', label: 'Edit configuration', description: 'Go to the configuration form' },
  {
    value: 'icon-providers',
    label: 'Explore icon providers',
    description: 'Seven optional icon sets',
    keywords: ['icons', 'svg'],
  },
];

export function extensions(refresh: () => void, log: (message: string) => void) {
  return html`
    <section id="extensions" aria-labelledby="extensions-heading">
      <div class="section-heading">
        <h2 id="extensions-heading">More ways to build</h2>
        <span>INPUT / NAVIGATION / UTILITIES</span>
      </div>
      <div class="library-grid">
        <t-card class="wide"
          ><span slot="heading">14 / Mission preferences</span>
          <form
            @submit=${(event: SubmitEvent) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget as HTMLFormElement);
              saved = `Example saved. Crew: ${data.get('crew')}. Mode: ${data.get('mode')}. Tags: ${data.getAll('tags').join(', ') || 'none'}.`;
              refresh();
            }}
            @reset=${() => {
              saved = '';
              refresh();
            }}
          >
            <div class="field-grid">
              <t-stack>
                <t-password-input
                  label="Example access key"
                  name="key"
                  value="mission-control"
                  help="Demonstration value. Nothing is sent or stored."
                ></t-password-input>
                <t-number-input
                  label="Crew size"
                  name="crew"
                  value="4"
                  min="1"
                  max="12"
                  required
                ></t-number-input>
                <t-segmented-control
                  label="Connection mode"
                  name="mode"
                  value="balanced"
                  .options=${[
                    { value: 'quiet', label: 'Quiet' },
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'fast', label: 'Fast' },
                  ]}
                ></t-segmented-control>
              </t-stack>
              <t-stack>
                <t-rating label="Mission rating" name="rating" value="4" clearable></t-rating>
                <t-tags-input
                  label="Mission tags"
                  name="tags"
                  value='["survey","navigation"]'
                  help="Type a tag and press Enter."
                ></t-tags-input>
                <t-color-picker
                  label="Marker color"
                  name="color"
                  value="#f5ba5b"
                  .swatches=${[
                    { value: '#f5ba5b', label: 'Amber marker' },
                    { value: '#a6ed91', label: 'Phosphor marker' },
                    { value: '#8edbe9', label: 'Ice marker' },
                  ]}
                ></t-color-picker>
              </t-stack>
            </div>
            <t-divider></t-divider>
            <t-stack direction="row" align="center" wrap
              ><t-button type="submit">Save example preferences</t-button
              ><t-button type="reset" variant="ghost">Reset preferences</t-button
              ><output class="tiny" aria-live="polite">${saved}</output></t-stack
            >
          </form>
          <span slot="footer">PASSWORD / NUMBER / SEGMENTS / RATING / TAGS / COLOR</span>
        </t-card>
        <t-card class="wide"
          ><span slot="heading">15 / Guided navigation</span>
          <t-stack>
            <t-steps
              label="Mission setup"
              .items=${steps}
              .value=${step}
              @t-select=${(event: CustomEvent) => {
                step = event.detail.value;
                refresh();
              }}
            ></t-steps>
            <p role="status">
              ${step === 'configure' ? 'Configure the example preferences above.' : step === 'review' ? 'Review your choices. This demonstration keeps all data in the browser.' : 'Your example mission is ready.'}
            </p>
            <t-toolbar label="Mission actions">
              <t-button
                variant="secondary"
                @click=${(event: Event) => document.querySelector<TCommandPalette>('#mission-commands')!.show(event.currentTarget as HTMLElement)}
                ><t-icon name="lucide:search"></t-icon> Find a command</t-button
              >
              <t-button variant="ghost" @click=${() => log('Mission preview refreshed.')}
                >Refresh preview</t-button
              >
              <t-button variant="ghost" disabled>Archive</t-button>
            </t-toolbar>
          </t-stack>
          <span slot="footer">t-steps / t-toolbar / t-command-palette</span>
        </t-card>
        <t-card
          ><span slot="heading">16 / Measurements & facts</span>
          <t-stack>
            ${keyed(
              meterPreview,
              html`<t-meter
                label="Oxygen reserve"
                value="82"
                min="0"
                max="100"
                low="20"
                high="60"
                optimum="100"
                value-text="82 percent — normal"
                variant=${meterVariant}
                size=${meterSize}
                animated
              ></t-meter>`,
            )}
            <t-description-list
              label="Mission facts"
              .items=${[
                { term: 'Vessel', value: 'Nostromo / demonstration' },
                { term: 'Destination', value: 'Outer survey sector' },
                { term: 'Status', value: 'Ready for review' },
              ]}
            ></t-description-list>
            <t-link href="#themes">Adjust appearance</t-link>
            <div class="copy-example">
              <code>mission --status</code
              ><t-copy-button value="mission --status" label="Copy status command"></t-copy-button>
            </div>
            <details>
              <summary>Meter options</summary>
              <t-stack style="margin-top:12px">
                <t-select
                  label="Meter style"
                  .value=${meterVariant}
                  .options=${[
                    { value: 'solid', label: 'Solid' },
                    { value: 'segmented-thin', label: 'Thin segments' },
                    { value: 'segmented-thick', label: 'Thick segments' },
                  ]}
                  @change=${(event: Event) => {
                    meterVariant = (event.target as HTMLSelectElement).value;
                    refresh();
                  }}
                ></t-select>
                <t-select
                  label="Meter size"
                  .value=${meterSize}
                  .options=${[
                    { value: 'small', label: 'Small' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'large', label: 'Large' },
                  ]}
                  @change=${(event: Event) => {
                    meterSize = (event.target as HTMLSelectElement).value;
                    refresh();
                  }}
                ></t-select>
                <t-button
                  variant="secondary"
                  @click=${() => {
                    meterPreview++;
                    refresh();
                  }}
                  >Replay meter entrance</t-button
                >
              </t-stack>
            </details>
          </t-stack>
          <span slot="footer">t-meter / t-description-list / t-link / t-copy-button</span>
        </t-card>
        <t-card
          ><span slot="heading">17 / Mission history</span>
          <t-timeline
            label="Mission history"
            .items=${[
              {
                id: 'one',
                title: 'Configuration loaded',
                description: 'Local preferences are available.',
                date: '09:41',
                dateTime: '2026-09-23T09:41:00',
                status: 'complete',
              },
              {
                id: 'two',
                title: 'Systems checked',
                description: 'Measurements are within the example range.',
                date: '09:42',
                dateTime: '2026-09-23T09:42:00',
                status: 'complete',
              },
              {
                id: 'three',
                title: 'Awaiting your command',
                description: 'Choose the next task from the command palette.',
                status: 'current',
              },
            ]}
          ></t-timeline>
          <span slot="footer">t-timeline / ORDERED EVENTS</span>
        </t-card>
        <t-card class="wide"
          ><span slot="heading">18 / Adjustable workspace</span>
          <t-split-pane
            label="Workspace divider"
            primary-label="Record summary"
            secondary-label="Record details"
            size="38"
          >
            <div slot="primary" class="pane-content">
              <h3>Record summary</h3>
              <p>Atmospheric survey<br />12.8 MB / complete</p>
            </div>
            <div slot="secondary" class="pane-content">
              <h3>Record details</h3>
              <p>
                Drag the divider or focus it and use the arrow keys. The panes stack on narrow
                screens.
              </p>
              <t-link href="#data-components">View mission records</t-link>
            </div>
          </t-split-pane>
          <span slot="footer">t-split-pane / POINTER & KEYBOARD RESIZE</span>
        </t-card>
        <t-card id="icon-providers" class="wide"
          ><span slot="heading">19 / Your choice of icons</span>
          <t-grid style="--t-grid-min:100px;--t-grid-gap:24px"
            >${providerExamples.map((icon) => html`<div class="icon-sample"><t-icon name=${icon.name} size="32"></t-icon><span>${icon.provider}</span></div>`)}</t-grid
          >
          <p>
            Register the icons your application needs. They inherit the current color and work with
            the same named icon buttons.
          </p>
          <t-stack direction="row" align="center" wrap
            ><t-icon-button
              name="ion:rocket"
              label="Launch mission preview"
              @click=${() => log('Mission preview launched.')}
            ></t-icon-button
            ><t-icon-button
              name="lucide:search"
              label="Search commands"
              @click=${(event: Event) => document.querySelector<TCommandPalette>('#mission-commands')!.show(event.currentTarget as HTMLElement)}
            ></t-icon-button
            ><a href=${creditsUrl} target="_blank" rel="noreferrer"
              >Icon credits and licenses</a
            ></t-stack
          >
          <span slot="footer"
            >IONICONS / FONT AWESOME FREE / LUCIDE / BOOTSTRAP / TABLER / HEROICONS / MATERIAL
            SYMBOLS</span
          >
        </t-card>
      </div>
    </section>
    <t-command-palette
      id="mission-commands"
      heading="Mission commands"
      .commands=${commands}
      @t-select=${(event: CustomEvent) => {
        const target = document.getElementById(event.detail.value);
        target?.scrollIntoView({ block: 'start' });
        log(`Command selected: ${event.detail.command.label}.`);
      }}
    ></t-command-palette>
  `;
}
