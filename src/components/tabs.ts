import { css, html, nothing, type PropertyValues } from 'lit';
import { baseStyles, HullframeElement } from '../internal/base';
export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}
/**
 * Tabs with automatic or manual keyboard activation. Slots use each tab's id.
 * An unavailable list retains focus when its focused tab disappears. Empty lists use a named group.
 * @slot id - Use each tab's ID as the slot name for its panel content.
 * @csspart tab - tab element.
 * @csspart panel - panel element.
 * @fires {CustomEvent<{ value: string }>} t-change - Selection changed. detail.value is the selected tab ID.
 */
export class TTabs extends HullframeElement {
  static properties = {
    tabs: { attribute: false },
    active: { reflect: true },
    label: {},
    orientation: { reflect: true },
    activation: { reflect: true },
    focusedId: { state: true },
  };
  /** Tab labels and IDs. Each ID must name one content slot. Replace the array to update it. */
  tabs: TabItem[] = [];
  /** Selected tab ID. Defaults to the first enabled tab. */
  active = '';
  /** Accessible name for the tablist. */
  label = 'Sections';
  /** Layout and arrow-key axis. */
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  /** Automatic selection follows arrow focus. Manual selection waits for Enter, Space, or click. */
  activation: 'automatic' | 'manual' = 'automatic';
  private focusedId = '';
  private hadTabFocus = false;
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      .tablist {
        display: flex;
        gap: 0;
        min-height: 24px;
        border-bottom: var(--t-divider-width, 1px) solid var(--t-border);
        overflow-x: auto;
        padding: 4px 4px 0;
      }
      .tablist:focus-visible {
        outline-offset: -2px;
      }
      :host([orientation='vertical']) {
        display: grid;
        grid-template-columns: minmax(0, 32%) minmax(0, 1fr);
        gap: var(--t-space, 16px);
      }
      :host([orientation='vertical']) .tablist {
        flex-direction: column;
        align-items: stretch;
        gap: 4px;
        border-bottom: 0;
        border-inline-end: var(--t-divider-width, 1px) solid var(--t-border);
        overflow-x: visible;
        padding: 4px;
      }
      button {
        flex: none;
        min-height: var(--t-control-height, 42px);
        min-width: 0;
        background: transparent;
        border: 0;
        border-bottom: var(--t-selection-width, 2px) solid transparent;
        color: var(--t-muted);
        padding: 12px 18px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        overflow-wrap: anywhere;
      }
      :host([orientation='vertical']) button {
        width: 100%;
        text-align: start;
        border-bottom-color: transparent;
        border-inline-start: var(--t-selection-width, 2px) solid transparent;
      }
      :host([orientation='vertical']) button[aria-selected='true'] {
        border-inline-start-color: var(--t-accent);
      }
      button[aria-selected='true'] {
        color: var(--t-accent);
        border-bottom-color: var(--t-accent);
        box-shadow: var(--_t-edge-glow);
        background: var(--t-raised);
      }
      button:focus-visible {
        outline-offset: -3px;
      }
      [role='tabpanel'] {
        min-width: 0;
        padding: 20px 4px 4px;
      }
      :host([orientation='vertical']) [role='tabpanel'] {
        padding-top: 4px;
      }
      @media (max-width: 480px) {
        :host([orientation='vertical']) {
          display: block;
        }
        :host([orientation='vertical']) .tablist {
          border-inline-end: 0;
          border-bottom: var(--t-divider-width, 1px) solid var(--t-border);
        }
      }
    `,
  ];
  protected willUpdate(changed: PropertyValues) {
    if (
      changed.has('tabs') ||
      changed.has('active') ||
      changed.has('activation') ||
      changed.has('focusedId')
    ) {
      this.hadTabFocus = this.shadowRoot?.activeElement?.matches('[role=tab], .tablist') ?? false;
      const previousActive = this.active;
      if (!this.tabs.some((t) => t.id === this.active && !t.disabled))
        this.active = this.tabs.find((t) => !t.disabled)?.id ?? '';
      if (
        changed.has('active') ||
        changed.has('activation') ||
        this.active !== previousActive ||
        !this.tabs.some((tab) => tab.id === this.focusedId && !tab.disabled)
      )
        this.focusedId = this.active;
    }
  }
  protected updated(changed: PropertyValues) {
    if (
      this.hadTabFocus &&
      (changed.has('tabs') ||
        changed.has('active') ||
        changed.has('activation') ||
        changed.has('focusedId'))
    ) {
      const targetId = this.activation === 'manual' ? this.focusedId : this.active;
      const target =
        Array.from(this.renderRoot.querySelectorAll<HTMLButtonElement>('[role=tab]')).find(
          (tab) => tab.dataset.tabId === targetId && !tab.disabled,
        ) ?? this.renderRoot.querySelector<HTMLElement>('.tablist');
      if (target && this.shadowRoot?.activeElement !== target) {
        target.focus();
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
    this.hadTabFocus = false;
  }
  private onFocusOut(event: FocusEvent) {
    if (
      this.activation === 'manual' &&
      !(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)
    )
      this.focusedId = this.active;
  }
  private activate(id: string) {
    if (id === this.active) return;
    this.active = id;
    this.emit('t-change', { value: id });
  }
  private onKey(event: KeyboardEvent) {
    const enabled = this.tabs.filter((t) => !t.disabled);
    const id = (event.target as HTMLElement).dataset.tabId;
    const index = enabled.findIndex((t) => t.id === id);
    const vertical = this.orientation === 'vertical';
    const rtl = getComputedStyle(this).direction === 'rtl';
    let next: number;
    if (event.key === (vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight'))
      next = (index + 1) % enabled.length;
    else if (event.key === (vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft'))
      next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    else return;
    event.preventDefault();
    if (enabled[next]) {
      if (this.activation === 'manual') this.focusedId = enabled[next].id;
      else this.activate(enabled[next].id);
    }
  }
  render() {
    return html`<div
        class="tablist"
        role=${this.tabs.length ? 'tablist' : 'group'}
        aria-label=${this.label}
        aria-orientation=${this.tabs.length ? this.orientation : nothing}
        tabindex=${this.tabs.some((tab) => !tab.disabled) ? -1 : 0}
        @keydown=${this.onKey}
        @focusout=${this.onFocusOut}
      >
        ${this.tabs.map(
          (tab, i) =>
            html`<button
              part="tab"
              role="tab"
              type="button"
              id=${`tab-${i}`}
              data-tab-id=${tab.id}
              aria-controls=${`panel-${i}`}
              aria-selected=${this.active === tab.id ? 'true' : 'false'}
              tabindex=${(this.activation === 'manual' ? this.focusedId || this.active : this.active) === tab.id ? 0 : -1}
              ?disabled=${tab.disabled}
              @focus=${() => {
                if (this.activation === 'manual') this.focusedId = tab.id;
              }}
              @click=${() => this.activate(tab.id)}
            >
              ${tab.label}
            </button>`,
        )}
      </div>
      ${this.tabs.map((tab, i) => html`<div part="panel" role="tabpanel" id=${`panel-${i}`} aria-labelledby=${`tab-${i}`} tabindex="0" ?hidden=${this.active !== tab.id}><slot name=${tab.id}></slot></div>`)}`;
  }
}
if (!customElements.get('t-tabs')) customElements.define('t-tabs', TTabs);
declare global {
  interface HTMLElementTagNameMap {
    't-tabs': TTabs;
  }
}
