import { css, html } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
/** Help tooltip with its own named button. Opens on hover/focus/click, dismisses on Escape. */
export class TTooltip extends TerminalElement {
  static properties = { label: {}, message: {}, open: { state: true } };
  label = 'More information';
  message = '';
  private open = false;
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
        position: relative;
      }
      button {
        width: 28px;
        height: 28px;
        background: transparent;
        border: 1px solid var(--t-border);
        color: var(--t-accent);
        font-size: 12px;
      }
      [role='tooltip'] {
        position: absolute;
        z-index: 10;
        bottom: calc(100% + 8px);
        left: 0;
        width: 220px;
        max-width: calc(100vw - 48px);
        border: 1px solid var(--t-border);
        padding: 10px 12px;
        background: var(--t-raised);
        color: var(--t-text);
        font-size: 11px;
        box-shadow: 0 5px 20px #0004;
      }
    `,
  ];
  render() {
    return html`<div
      @mouseenter=${() => (this.open = true)}
      @mouseleave=${() => {
        if (this.shadowRoot?.activeElement?.tagName !== 'BUTTON') this.open = false;
      }}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.open = false;
          e.stopPropagation();
        }
      }}
    >
      <button
        type="button"
        part="trigger"
        aria-label=${this.label}
        aria-describedby="tip"
        @focus=${() => (this.open = true)}
        @blur=${() => (this.open = false)}
        @click=${() => (this.open = true)}
      >
        ?
      </button>
      <div part="tooltip" id="tip" role="tooltip" ?hidden=${!this.open}>${this.message}</div>
    </div>`;
  }
}
customElements.define('t-tooltip', TTooltip);
declare global {
  interface HTMLElementTagNameMap {
    't-tooltip': TTooltip;
  }
}
