import { css, html } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
/**
 * Bordered content panel.
 * @slot heading - Panel title.
 * @slot - Body.
 * @slot footer - Actions or metadata.
 * @csspart heading - heading element.
 * @csspart body - body element.
 * @csspart footer - footer element.
 */
export class TCard extends TerminalElement {
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        border: var(--t-line-width, 1px) solid var(--t-border);
        box-shadow: var(--_t-edge-glow);
        background: var(--t-surface);
      }
      .heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px var(--t-space);
        border-bottom: var(--t-divider-width, 1px) solid var(--t-border);
        background: var(--t-raised);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .body {
        padding: var(--t-space);
      }
      .footer {
        padding: 12px var(--t-space);
        border-top: var(--t-divider-width, 1px) solid var(--t-border);
        color: var(--t-muted);
        font-size: 11px;
      }
    `,
  ];
  private emptySlot(event: Event) {
    const slot = event.target as HTMLSlotElement;
    slot.parentElement!.hidden = !slot.assignedNodes({ flatten: true }).length;
  }
  render() {
    return html`<div class="heading" part="heading" hidden>
        <slot name="heading" @slotchange=${this.emptySlot}></slot>
      </div>
      <div class="body" part="body"><slot></slot></div>
      <div class="footer" part="footer" hidden>
        <slot name="footer" @slotchange=${this.emptySlot}></slot>
      </div>`;
  }
}
if (!customElements.get('t-card')) customElements.define('t-card', TCard);
declare global {
  interface HTMLElementTagNameMap {
    't-card': TCard;
  }
}
