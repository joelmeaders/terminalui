import { css, html, type PropertyValues } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}
/** Horizontal tabs with automatic keyboard activation. Slots use each tab's id. Emits t-change with {value}. */
export class TTabs extends TerminalElement {
  static properties = { tabs: { attribute: false }, active: { reflect: true }, label: {} };
  tabs: TabItem[] = [];
  active = '';
  label = 'Sections';
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }
      [role='tablist'] {
        display: flex;
        gap: 0;
        border-bottom: var(--t-divider-width, 1px) solid var(--t-border);
        overflow-x: auto;
        padding: 4px 4px 0;
      }
      button {
        flex: none;
        background: transparent;
        border: 0;
        border-bottom: var(--t-selection-width, 2px) solid transparent;
        color: var(--t-muted);
        padding: 12px 18px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
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
        padding: 20px 4px 4px;
      }
    `,
  ];
  protected willUpdate(changed: PropertyValues) {
    if (changed.has('tabs') || changed.has('active')) {
      if (!this.tabs.some((t) => t.id === this.active && !t.disabled))
        this.active = this.tabs.find((t) => !t.disabled)?.id ?? '';
    }
  }
  private activate(id: string, focus = false) {
    this.active = id;
    this.emit('t-change', { value: id });
    if (focus)
      this.updateComplete.then(() =>
        this.renderRoot.querySelector<HTMLButtonElement>('button[aria-selected=true]')?.focus(),
      );
  }
  private onKey(event: KeyboardEvent) {
    const enabled = this.tabs.filter((t) => !t.disabled);
    const index = enabled.findIndex((t) => t.id === this.active);
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % enabled.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    else return;
    event.preventDefault();
    if (enabled[next]) this.activate(enabled[next].id, true);
  }
  render() {
    return html`<div role="tablist" aria-label=${this.label} @keydown=${this.onKey}>
        ${this.tabs.map((tab, i) => html`<button part="tab" role="tab" type="button" id=${`tab-${i}`} aria-controls=${`panel-${i}`} aria-selected=${this.active === tab.id ? 'true' : 'false'} tabindex=${this.active === tab.id ? 0 : -1} ?disabled=${tab.disabled} @click=${() => this.activate(tab.id)}>${tab.label}</button>`)}
      </div>
      ${this.tabs.map((tab, i) => html`<div part="panel" role="tabpanel" id=${`panel-${i}`} aria-labelledby=${`tab-${i}`} tabindex="0" ?hidden=${this.active !== tab.id}><slot name=${tab.id}></slot></div>`)}`;
  }
}
customElements.define('t-tabs', TTabs);
declare global {
  interface HTMLElementTagNameMap {
    't-tabs': TTabs;
  }
}
