import { html } from 'lit';
import type { SpinnerType, TDrawer, TToast } from '../src/index';

const destinations = [
  { value: 'archive', label: 'Archive' },
  { value: 'observatory', label: 'Observatory' },
  { value: 'engineering', label: 'Engineering' },
];
const rows = [
  { id: '01', name: 'Atmospheric survey', owner: 'E. Ripley', status: 'Complete', size: '12.8 MB' },
  { id: '02', name: 'Navigation log', owner: 'A. Dallas', status: 'In review', size: '4.2 MB' },
  { id: '03', name: 'Engine diagnostics', owner: 'J. Parker', status: 'Complete', size: '8.1 MB' },
  { id: '04', name: 'Mission briefing', owner: 'J. Lambert', status: 'Draft', size: '2.4 MB' },
  { id: '05', name: 'Crew manifest', owner: 'E. Ripley', status: 'Complete', size: '0.8 MB' },
  { id: '06', name: 'Communications', owner: 'A. Dallas', status: 'Draft', size: '6.2 MB' },
];
let page = 1;
let saved = '';
let notificationCountdown: TToast['countdown'] = 'bar';
let notificationUnit: TToast['countdownUnit'] = 'seconds';
let notificationDuration = 5000;
let spinnerType: SpinnerType = 'ring';
let spinnerSteps: 6 | 8 = 8;
const spinnerOptions = [
  { value: 'ring', label: 'Modern / Ring' },
  { value: 'dots', label: 'Modern / Dots' },
  { value: 'bars', label: 'Modern / Bars' },
  { value: 'pulse', label: 'Modern / Pulse' },
  { value: 'orbit', label: 'Modern / Orbit' },
  { value: 'cursor', label: 'Terminal / Cursor' },
  { value: 'cursor-box', label: 'Terminal / Cursor box' },
  { value: 'arrow', label: 'Terminal / Stepped arrow' },
  { value: 'pixels', label: 'Terminal / Pixels' },
  { value: 'blocks', label: 'Terminal / Blocks' },
];

export function library(refresh: () => void, log: (message: string) => void) {
  return html`
    <section id="library" aria-labelledby="library-heading">
      <div class="section-heading">
        <h2 id="library-heading">Application components</h2>
        <span>FORMS / DATA / LAYOUT</span>
      </div>
      <p class="library-intro">
        The same shared tokens, from a single icon to a complete application screen.
      </p>
      <div class="library-grid">
        <t-card id="extended-forms" class="wide"
          ><span slot="heading">08 / Richer forms</span>
          <form
            @submit=${(event: SubmitEvent) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget as HTMLFormElement);
              saved = `Request saved for ${data.get('department')}. Priority: ${data.get('priority')}.`;
              refresh();
              document
                .querySelector<TToast>('#library-toast')!
                .show(
                  saved,
                  document.querySelector<HTMLElement>('#extended-forms t-button[type="submit"]')!,
                );
            }}
            @reset=${() => {
              saved = '';
              refresh();
            }}
          >
            <div class="field-grid">
              <t-stack>
                <t-combobox
                  label="Department"
                  name="department"
                  value="archive"
                  required
                  .options=${destinations}
                  help="Type to filter destinations."
                ></t-combobox>
                <t-textarea
                  label="Request details"
                  name="details"
                  placeholder="Describe the work to be done…"
                  rows="3"
                ></t-textarea>
                <t-file-input
                  label="Attachments"
                  name="attachments"
                  multiple
                  help="Files stay in this browser. Nothing is uploaded."
                ></t-file-input>
              </t-stack>
              <t-stack>
                <t-radio-group
                  label="Priority"
                  name="priority"
                  value="normal"
                  .options=${[
                    { value: 'normal', label: 'Normal' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' },
                  ]}
                ></t-radio-group>
                <t-range
                  label="Signal strength"
                  name="strength"
                  value="65"
                  min="0"
                  max="100"
                ></t-range>
                <t-switch
                  label="Notify the team"
                  name="notify"
                  checked
                  help="Example setting only."
                ></t-switch>
              </t-stack>
            </div>
            <t-divider></t-divider>
            <t-stack direction="row" align="center" wrap
              ><t-button type="submit">Save request</t-button
              ><t-button type="reset" variant="ghost">Reset request</t-button
              ><output class="tiny" aria-live="polite">${saved}</output></t-stack
            >
          </form>
          <span slot="footer"
            >t-combobox / t-textarea / t-file-input / t-radio-group / t-range / t-switch</span
          >
        </t-card>
        <t-card id="data-components" class="wide"
          ><span slot="heading">09 / Records & navigation</span>
          <t-stack>
            <t-breadcrumb
              .items=${[
                { label: 'Workbench', href: '#workbench' },
                { label: 'Records', current: true },
              ]}
            ></t-breadcrumb>
            <div class="record-toolbar">
              <div class="row">
                <t-avatar name="Ellen Ripley" size="small"></t-avatar><span>Mission archive</span>
              </div>
              <t-menu
                label="Record actions"
                .options=${[
                  { value: 'export', label: 'Prepare export' },
                  { value: 'refresh', label: 'Refresh records' },
                  { value: 'delete', label: 'Delete', disabled: true },
                ]}
                @t-select=${(e: CustomEvent) => log(e.detail.value === 'export' ? 'Demo export prepared.' : 'Demo records refreshed.')}
              ></t-menu>
            </div>
            <t-table
              caption="Mission records"
              selectable
              .columns=${[
                { key: 'name', label: 'Document', sortable: true },
                { key: 'owner', label: 'Owner', sortable: true },
                { key: 'status', label: 'Status', sortable: true },
                { key: 'size', label: 'Size' },
              ]}
              .rows=${rows.slice((page - 1) * 3, page * 3)}
              @t-selection-change=${(e: CustomEvent) => log(`${e.detail.selectedKeys.length} records selected on this page.`)}
            ></t-table>
            <t-pagination
              .page=${page}
              total="6"
              page-size="3"
              @t-change=${(e: CustomEvent) => {
                page = e.detail.page;
                refresh();
              }}
            ></t-pagination> </t-stack
          ><span slot="footer">t-breadcrumb / t-avatar / t-menu / t-table / t-pagination</span>
        </t-card>
        <t-card id="tree-components"
          ><span slot="heading">10 / Hierarchies</span>
          <t-tree
            label="Project files"
            .expandedIds=${['project']}
            .items=${[
              {
                id: 'project',
                label: 'Mission archive',
                children: [
                  {
                    id: 'reports',
                    label: 'Reports',
                    children: [
                      { id: 'survey', label: 'Atmospheric survey' },
                      { id: 'diagnostics', label: 'Engine diagnostics' },
                    ],
                  },
                  { id: 'crew', label: 'Crew manifest' },
                  { id: 'restricted', label: 'Restricted', disabled: true },
                ],
              },
            ]}
            @t-select=${(e: CustomEvent) => log(`Selected ${e.detail.item.label}.`)}
          ></t-tree>
          <span slot="footer">t-tree / ARROW KEYS / TYPE TO FIND</span>
        </t-card>
        <t-card id="context-components"
          ><span slot="heading">11 / Context & actions</span>
          <t-stack>
            <div class="row wrap">
              <t-icon-button
                name="settings"
                label="Open workspace settings"
                @click=${(e: Event) => document.querySelector<TDrawer>('#library-drawer')!.show(e.currentTarget as HTMLElement)}
              ></t-icon-button>
              <t-button
                id="open-library-drawer"
                variant="secondary"
                @click=${(e: Event) => document.querySelector<TDrawer>('#library-drawer')!.show(e.currentTarget as HTMLElement)}
                >Open drawer</t-button
              >
              <t-popover label="Quick settings" heading="Quick settings"
                ><t-stack
                  ><t-switch label="Show metadata" checked></t-switch
                  ><t-checkbox label="Include archived records"></t-checkbox>
                  <t-select
                    label="Notification countdown"
                    .value=${notificationCountdown}
                    .options=${[
                      { value: 'none', label: 'None' },
                      { value: 'bar', label: 'Shrinking bar' },
                      { value: 'spinner', label: 'Spinner with countdown' },
                    ]}
                    @change=${(event: Event) => {
                      notificationCountdown = (event.currentTarget as HTMLSelectElement)
                        .value as TToast['countdown'];
                      refresh();
                    }}
                  ></t-select>
                  <t-select
                    label="Countdown unit"
                    .value=${notificationUnit}
                    .options=${[
                      { value: 'seconds', label: 'Seconds' },
                      { value: 'milliseconds', label: 'Milliseconds' },
                    ]}
                    @change=${(event: Event) => {
                      notificationUnit = (event.currentTarget as HTMLSelectElement)
                        .value as TToast['countdownUnit'];
                      refresh();
                    }}
                  ></t-select>
                  <t-number-input
                    label="Dismiss after (seconds)"
                    min="0"
                    step="1"
                    .value=${String(notificationDuration / 1000)}
                    help="Use 0 to keep notifications open. Hover or focus pauses the timer."
                    @change=${(event: Event) => {
                      notificationDuration =
                        Number((event.currentTarget as HTMLInputElement).value) * 1000;
                      refresh();
                    }}
                  ></t-number-input> </t-stack
              ></t-popover>
            </div>
            <p>
              Use drawers for focused tasks, popovers for nearby settings, and named icon buttons
              for compact actions.
            </p>
            <t-button
              variant="ghost"
              @click=${(e: Event) => document.querySelector<TToast>('#library-toast')!.show('Settings saved. Your workspace is ready.', e.currentTarget as HTMLElement)}
              >Show notification</t-button
            > </t-stack
          ><span slot="footer">t-icon-button / t-drawer / t-popover / t-toast</span>
        </t-card>
        <t-card id="status-components"
          ><span slot="heading">12 / Loading & empty states</span>
          <t-stack
            ><div class="row">
              <t-spinner
                label="Loading example"
                size="large"
                .type=${spinnerType}
                .steps=${spinnerSteps}
              ></t-spinner
              ><span class="tiny">LOADING PREVIEW</span>
            </div>
            <t-select
              label="Spinner style"
              .value=${spinnerType}
              .options=${spinnerOptions}
              @change=${(event: Event) => {
                spinnerType = (event.currentTarget as HTMLSelectElement).value as SpinnerType;
                refresh();
              }}
            ></t-select>
            ${
              spinnerType === 'arrow'
                ? html`<t-select
                    label="Arrow positions"
                    .value=${String(spinnerSteps)}
                    .options=${[
                      { value: '8', label: '8 positions' },
                      { value: '6', label: '6 positions' },
                    ]}
                    @change=${(event: Event) => {
                      spinnerSteps = Number((event.currentTarget as HTMLSelectElement).value) as
                        6 | 8;
                      refresh();
                    }}
                  ></t-select>`
                : ''
            }
            <t-skeleton></t-skeleton><t-skeleton style="--t-skeleton-width:65%"></t-skeleton
            ><t-divider></t-divider
            ><t-empty-state heading="No pending tasks"
              >Everything is up to date.</t-empty-state
            ></t-stack
          >
          <span slot="footer">t-spinner / t-skeleton / t-divider / t-empty-state</span>
        </t-card>
        <t-card id="layout-components"
          ><span slot="heading">13 / Layout & iconography</span>
          <t-stack
            ><t-grid style="--t-grid-min:70px;--t-grid-gap:16px"
              >${['folder', 'file', 'search', 'upload', 'download', 'settings', 'user', 'check'].map((name) => html`<div class="icon-sample"><t-icon name=${name}></t-icon><span>${name}</span></div>`)}</t-grid
            ><t-divider></t-divider>
            <p>
              Stack and grid compose responsive layouts. Icons inherit color and line weight from
              the same theme.
            </p></t-stack
          >
          <span slot="footer">t-stack / t-grid / t-icon</span>
        </t-card>
      </div>
      <div class="library-notification">
        <t-toast
          id="library-toast"
          variant="success"
          .duration=${notificationDuration}
          .countdown=${notificationCountdown}
          .countdownUnit=${notificationUnit}
        ></t-toast>
      </div>
    </section>
    <t-drawer id="library-drawer" heading="Workspace settings"
      ><t-stack
        ><t-input label="Workspace name" value="Mission archive"></t-input
        ><t-select label="Default department" value="archive" .options=${destinations}></t-select
        ><t-switch label="Show activity feed" checked></t-switch>
        <p class="tiny">These settings are a local demonstration.</p></t-stack
      ><t-button
        slot="footer"
        @click=${() => {
          document.querySelector<TDrawer>('#library-drawer')!.close();
          document
            .querySelector<TToast>('#library-toast')!
            .show(
              'Workspace settings saved.',
              document.querySelector<HTMLElement>('#open-library-drawer')!,
            );
        }}
        >Save settings</t-button
      ></t-drawer
    >
  `;
}
