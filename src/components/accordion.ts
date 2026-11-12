import { css, html } from 'lit';
import { baseStyles, HullframeElement } from '../internal/base';
import { inlineSlotStyles } from '../internal/slots';
/**
 * Native disclosure. Emits t-toggle with {open}.
 * @fires {CustomEvent<{ open: boolean }>} t-toggle - Disclosure changed. detail.open is the new boolean state.
 * @slot - Expanded content.
 * @slot start - Non-interactive icon before the summary label.
 * @slot end - Non-interactive icon or status after the summary label.
 * @csspart summary - summary element.
 * @csspart content - content element.
 */
export class TAccordion extends HullframeElement {
  static properties = { label: {}, open: { type: Boolean, reflect: true } };
  label = '';
  open = false;
  static styles = [
    baseStyles,
    inlineSlotStyles,
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
      <summary part="summary">
        <slot name="start"></slot>${this.label}<slot name="end"></slot>
      </summary>
      <div class="content" part="content"><slot></slot></div>
    </details>`;
  }
}
if (!customElements.get('t-accordion')) customElements.define('t-accordion', TAccordion);
declare global {
  interface HTMLElementTagNameMap {
    't-accordion': TAccordion;
  }
}
