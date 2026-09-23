import { html, render } from 'lit';
import '../src/index';
import '../src/themes.css';
import './style.css';
import type { TDialog } from '../src/index';

const themes = [
  { id: 'amber', name: 'Amber', color: '#f5ba5b', code: '01' },
  { id: 'phosphor', name: 'Phosphor', color: '#a6ed91', code: '02' },
  { id: 'ice', name: 'Ice', color: '#8edbe9', code: '03' },
  { id: 'lunar', name: 'Lunar', color: '#c6baf2', code: '04' },
  { id: 'signal', name: 'Signal', color: '#eef2e8', code: '05' },
  { id: 'paper', name: 'Paper', color: '#b6bea0', code: '06' },
];
let theme = 'amber';
let compact = false;
let effects = false;
let formMessage = '';
let saved = false;
try {
  const prefs = JSON.parse(localStorage.getItem('terminal-kit') || '{}');
  theme = themes.some((t) => t.id === prefs.theme) ? prefs.theme : 'amber';
  compact = !!prefs.compact;
  effects = !!prefs.effects;
} catch {
  /* Storage is optional. */
}
const options = [
  { value: '', label: 'Select a destination' },
  { value: 'website', label: 'Website' },
  { value: 'application', label: 'Application' },
  { value: 'library', label: 'Component library' },
];
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'specification', label: 'Specification' },
  { id: 'activity', label: 'Activity' },
];
const storybookUrl = import.meta.env.DEV ? 'http://127.0.0.1:6006' : './storybook/index.html';

function preferences() {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.density = compact ? 'compact' : 'comfortable';
  root.dataset.effects = effects ? 'crt' : 'clean';
  try {
    localStorage.setItem('terminal-kit', JSON.stringify({ theme, compact, effects }));
  } catch {
    /* Work without persistence. */
  }
  draw();
}
function submit(event: SubmitEvent) {
  event.preventDefault();
  const data = new FormData(event.target as HTMLFormElement);
  saved = true;
  formMessage = `Configuration saved: ${data.get('callsign')} / ${data.get('destination')}.`;
  draw();
}
function openDialog(event: Event) {
  document.querySelector<TDialog>('#example-dialog')!.show(event.currentTarget as HTMLElement);
}
function action(label: string) {
  formMessage = label;
  draw();
}
function draw() {
  render(
    html`
      <header class="masthead">
        <a class="brand" href="#" aria-label="Terminal Kit home"
          ><span class="brand-mark" aria-hidden="true">T<span>_</span></span
          ><span>TERMINAL<span class="brand-sub">INTERFACE SYSTEM / 001</span></span></a
        >
        <nav class="top-nav" aria-label="Main">
          <a href="#workbench" class="active">Workbench</a><a href="#themes">Themes</a
          ><a href=${storybookUrl} target="_blank" rel="noreferrer"
            >Documentation <span aria-hidden="true">↗</span></a
          >
        </nav>
        <span class="release"><i></i> V0.1 / PROOF OF CONCEPT</span>
      </header>
      <div class="shell">
        <aside class="sidebar" aria-label="Component navigation">
          <div class="side-label">SYSTEM DIRECTORY</div>
          <a class="directory active" href="#workbench"
            ><span>00</span> Overview <span class="directory-arrow">↗</span></a
          >
          <div class="side-label section-label">COMPONENTS</div>
          <a class="directory" href="#buttons"><span>01</span> Actions <small>02</small></a>
          <a class="directory" href="#forms"><span>02</span> Form controls <small>03</small></a>
          <a class="directory" href="#feedback"><span>03</span> Feedback <small>03</small></a>
          <a class="directory" href="#navigation"><span>04</span> Navigation <small>02</small></a>
          <a class="directory" href="#overlays"><span>05</span> Overlays <small>02</small></a>
          <div class="sidebar-note">
            <span class="crosshair" aria-hidden="true">＋</span>
            <p>FAMILIAR CONTROLS.<br />DIFFERENT ATMOSPHERE.</p>
            <div class="mini-bars" aria-hidden="true">▁▂▄▆▃▅▇▅▂▄▆▇▅▃▂▅▆</div>
            <span class="tiny">BUILT WITH LIT · WEB STANDARDS</span>
          </div>
        </aside>
        <main id="workbench">
          <section class="hero" aria-labelledby="hero-title">
            <div class="hero-copy">
              <div class="eyebrow">
                <span class="status-dot"></span> TERMINAL KIT / COMPONENT WORKBENCH
              </div>
              <h1 id="hero-title">Built for the web.<br /><span>Tuned to another era.</span></h1>
              <p>
                Familiar controls. Phosphor character. A lightweight Lit component kit for everyday
                websites and applications.
              </p>
              <div class="hero-meta">
                <span>12 COMPONENTS</span><b>+</b><span>06 THEMES</span><b>+</b
                ><span>ONE SHARED SYSTEM</span>
              </div>
            </div>
            <div class="hero-instrument" aria-hidden="true">
              <div class="instrument-top"><span>DISPLAY CALIBRATION</span><span>CH / 01</span></div>
              <svg viewBox="0 0 320 136" fill="none">
                <defs>
                  <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
                    <path d="M16 0H0V16" stroke="currentColor" stroke-opacity=".13" />
                  </pattern>
                </defs>
                <rect width="320" height="136" fill="url(#grid)" />
                <circle cx="160" cy="68" r="48" stroke="currentColor" stroke-opacity=".5" />
                <circle cx="160" cy="68" r="31" stroke="currentColor" stroke-dasharray="2 6" />
                <path
                  d="M0 68H99l8-8 12 26 16-60 15 94 16-107 14 84 13-42 12 19 8-6h107"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <path d="M160 0V136M0 68H320" stroke="currentColor" stroke-opacity=".25" />
                <rect x="156" y="64" width="8" height="8" fill="currentColor" />
              </svg>
              <div class="instrument-bottom">
                <span>RGB / ${themes.find((t) => t.id === theme)!.name.toUpperCase()}</span
                ><span>SIGNAL STABLE</span>
              </div>
            </div>
          </section>
          <section class="theme-console" id="themes" aria-label="Appearance settings">
            <div class="theme-label">
              <span class="eyebrow">APPEARANCE</span><span>Choose your frequency.</span>
            </div>
            <div class="swatches" role="group" aria-label="Color theme">
              ${themes.map(
                (t) =>
                  html`<button
                    class="swatch ${theme === t.id ? 'selected' : ''}"
                    aria-pressed=${theme === t.id}
                    @click=${() => {
                      theme = t.id;
                      preferences();
                    }}
                  >
                    <span class="swatch-color" style=${`--swatch:${t.color}`}></span
                    ><span>${t.name}</span><small>${t.code}</small>
                  </button>`,
              )}
            </div>
            <div class="appearance-switches">
              <label
                ><input
                  type="checkbox"
                  .checked=${effects}
                  @change=${(e: Event) => {
                    effects = (e.target as HTMLInputElement).checked;
                    preferences();
                  }}
                />
                CRT texture</label
              ><label
                ><input
                  type="checkbox"
                  .checked=${compact}
                  @change=${(e: Event) => {
                    compact = (e.target as HTMLInputElement).checked;
                    preferences();
                  }}
                />
                Compact</label
              >
            </div>
          </section>
          <div class="section-heading">
            <h2>Component inventory</h2>
            <span><span class="status-dot"></span> LIVE / INTERACTIVE</span>
          </div>
          <div class="component-grid">
            <t-card id="buttons"
              ><span slot="heading">01 / Actions</span>
              <div class="spec-label">BUTTON VARIANTS</div>
              <div class="row wrap">
                <t-button @click=${() => action('Primary action activated.')}
                  >Initialize <span aria-hidden="true">↗</span></t-button
                ><t-button variant="secondary" @click=${() => action('Secondary action activated.')}
                  >Secondary</t-button
                ><t-button variant="ghost" @click=${() => action('Ghost action activated.')}
                  >Ghost →</t-button
                >
              </div>
              <div class="spec-label second-label">STATES & SIZES</div>
              <div class="row wrap">
                <t-button size="small" @click=${() => action('Small action activated.')}
                  >Small</t-button
                ><t-button variant="secondary" disabled>Disabled</t-button
                ><t-button variant="secondary" loading>Processing</t-button
                ><t-button variant="danger" size="small" @click=${openDialog}>Discard</t-button>
              </div>
              <span slot="footer"
                >t-button <span class="footer-right">04 VARIANTS / 03 SIZES</span></span
              ></t-card
            >
            <t-card
              ><span slot="heading">02 / Status indicators</span>
              <div class="spec-label">BADGES</div>
              <div class="row wrap badge-row">
                <t-badge variant="success">Operational</t-badge
                ><t-badge variant="warning">Standby</t-badge
                ><t-badge variant="danger">Offline</t-badge><t-badge>Unknown</t-badge>
              </div>
              <div class="spec-label second-label">PROGRESS</div>
              <t-progress value="68" label="Resource allocation"></t-progress
              ><span slot="footer"
                >t-badge / t-progress <span class="footer-right">TEXT + COLOR</span></span
              ></t-card
            >
            <t-card id="forms"
              ><span slot="heading">03 / Configuration form</span>
              <form
                id="config-form"
                @submit=${submit}
                @reset=${() => {
                  saved = false;
                  formMessage = 'Form reset.';
                  draw();
                }}
              >
                <div class="field-grid">
                  <t-input
                    label="Callsign"
                    name="callsign"
                    placeholder="e.g. EXPLORER-01"
                    required
                    help="A name for your workspace."
                  ></t-input
                  ><t-select
                    label="Destination"
                    name="destination"
                    required
                    .options=${options}
                  ></t-select>
                </div>
                <div class="form-toggles">
                  <t-checkbox
                    name="telemetry"
                    label="Enable diagnostic logging"
                    checked
                  ></t-checkbox
                  ><t-checkbox
                    name="notifications"
                    label="System notifications"
                    switch
                  ></t-checkbox>
                </div>
                <div class="row">
                  <button class="t-native submit" type="submit">
                    ${saved ? '✓ Saved' : 'Save configuration'}</button
                  ><button class="reset" type="reset">Reset</button>
                </div>
              </form>
              <span slot="footer"
                >t-input / t-select / t-checkbox
                <span class="footer-right">NATIVE FORMS</span></span
              ></t-card
            >
            <t-card id="feedback"
              ><span slot="heading">04 / System feedback</span>
              <div class="stack">
                <t-alert variant="success">Connection established. All systems are ready.</t-alert
                ><t-alert variant="warning">Storage is approaching its configured limit.</t-alert
                ><t-alert variant="info" dismissible>This notice can be dismissed.</t-alert>
              </div>
              <span slot="footer"
                >t-alert <span class="footer-right">INLINE / DISMISSIBLE</span></span
              ></t-card
            >
            <t-card id="navigation" class="wide"
              ><span slot="heading">05 / Content navigation</span
              ><t-tabs .tabs=${tabs} label="Example content"
                ><div slot="overview" class="tab-overview">
                  <div>
                    <h3>Everything in its place.</h3>
                    <p>
                      Use familiar navigation to organize unfamiliar worlds. Switch tabs with your
                      mouse or the arrow keys.
                    </p>
                    <t-badge variant="accent">Keyboard ready</t-badge>
                  </div>
                  <div class="spec-table">
                    <div><span>ENGINE</span><strong>Lit 3</strong></div>
                    <div><span>FOUNDATION</span><strong>Web Components</strong></div>
                    <div><span>DEPENDENCIES</span><strong>One runtime</strong></div>
                  </div>
                </div>
                <div slot="specification">
                  <h3>A small, explicit API.</h3>
                  <p>
                    Set <code>tabs</code> to an array of IDs and labels. Assign content to matching
                    slots. Listen for <code>t-change</code>.
                  </p>
                  <pre>&lt;t-tabs active="overview"&gt;…&lt;/t-tabs&gt;</pre>
                </div>
                <div slot="activity">
                  <h3>System activity</h3>
                  <ul class="activity">
                    <li><time>09:41</time> Component registry initialized</li>
                    <li><time>09:42</time> Theme tokens applied</li>
                    <li><time>09:43</time> Workbench ready for input</li>
                  </ul>
                </div></t-tabs
              ><span slot="footer"
                >t-tabs <span class="footer-right">ARROW KEYS / HOME / END</span></span
              ></t-card
            >
            <t-card
              ><span slot="heading">06 / Disclosure</span>
              <div class="stack">
                <t-accordion label="What is Terminal Kit?" open
                  >A collection of reusable, terminal-inspired controls built with Lit and standard
                  browser APIs.</t-accordion
                ><t-accordion label="Can I use it without a framework?"
                  >Yes. Import the browser bundle and theme CSS, then use the custom elements in
                  HTML.</t-accordion
                >
              </div>
              <span slot="footer"
                >t-accordion <span class="footer-right">NATIVE DETAILS</span></span
              ></t-card
            >
            <t-card id="overlays"
              ><span slot="heading">07 / Overlays & help</span>
              <h3>A little context, on demand.</h3>
              <p>Dialogs for focused decisions. Tooltips for supporting information.</p>
              <div class="row">
                <t-button variant="secondary" @click=${openDialog}>Open dialog ↗</t-button
                ><t-tooltip
                  label="About overlays"
                  message="The dialog uses native focus management. Press Escape to close it."
                ></t-tooltip
                ><span class="tiny">FOCUS OR HOVER FOR HELP</span>
              </div>
              <span slot="footer"
                >t-dialog / t-tooltip <span class="footer-right">ESC TO DISMISS</span></span
              ></t-card
            >
          </div>
          <div class="event-console" role="status" aria-live="polite">
            <span class="console-prefix">&gt; EVENT LOG</span
            ><span>${formMessage || 'Awaiting input. Try a component above.'}</span
            ><span class="cursor" aria-hidden="true">▌</span>
          </div>
          <footer class="page-footer">
            <span>TERMINAL KIT / V0.1.0</span><span>MODERN PRIMITIVES. ANALOG CHARACTER.</span
            ><a href=${storybookUrl} target="_blank" rel="noreferrer"
              >Explore the documentation ↗</a
            >
          </footer>
        </main>
      </div>
      <t-dialog id="example-dialog" heading="Discard this configuration?"
        ><p>This is a demonstration. Your workspace and files will remain unchanged.</p>
        <t-button
          slot="footer"
          variant="secondary"
          @click=${() => document.querySelector<TDialog>('#example-dialog')!.close()}
          >Cancel</t-button
        ><t-button
          slot="footer"
          variant="danger"
          @click=${() => {
            document.querySelector<TDialog>('#example-dialog')!.close();
            action('Demo configuration discarded. No files were changed.');
          }}
          >Discard demo</t-button
        ></t-dialog
      >
    `,
    document.querySelector<HTMLElement>('#app')!,
  );
}
preferences();
