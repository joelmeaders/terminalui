import { css, html } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
/** Native disclosure. Emits t-toggle with {open}. @slot - Expanded content. */
export class TAccordion extends TerminalElement {
  static properties = { label: {}, open: { type: Boolean, reflect: true } };
  label = '';
  open = false;
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        border: var(--t-line-width, 1px) solid var(--t-border);
        box-shadow: var(--_t-edge-glow);
        background: var(--t-surface);
      }
      summary {
        padding: 14px 16px;
        cursor: pointer;
        font-size: 12px;
      }
      summary::marker {
        color: var(--t-accent);
      }
      .content {
        padding: 0 16px 16px;
        font-size: 13px;
        color: var(--t-muted);
      }
    `,
  ];
  render() {
    return html`<details
      .open=${this.open}
      @toggle=${(event: Event) => {
        const open = (event.target as HTMLDetailsElement).open;
        if (this.open !== open) {
          this.open = open;
          this.emit('t-toggle', { open });
        }
      }}
    >
      <summary part="summary">${this.label}</summary>
      <div class="content" part="content"><slot></slot></div>
    </details>`;
  }
}
customElements.define('t-accordion', TAccordion);
declare global {
  interface HTMLElementTagNameMap {
    't-accordion': TAccordion;
  }
}
