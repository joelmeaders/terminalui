import { css, html, type PropertyValues } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
import { observeFloating, type Placement } from '../internal/floating';
/**
 * Help tooltip with its own named button. Opens on hover/focus/click, dismisses on Escape.
 * @csspart trigger - trigger element.
 * @csspart tooltip - tooltip element.
 */
export class TTooltip extends TerminalElement {
  static properties = { label: {}, message: {}, placement: {}, open: { state: true } };
  label = 'More information';
  message = '';
  placement: Placement = 'top';
  private open = false;
  private cleanup?: () => void;
  private listeningDocument?: Document;
  private closeTimer?: ReturnType<typeof setTimeout>;
  private hovered = false;
  private clearCloseTimer() {
    clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
  }
  private showTooltip() {
    this.clearCloseTimer();
    this.open = true;
  }
  private hideTooltip() {
    this.clearCloseTimer();
    this.open = false;
  }
  private scheduleClose() {
    this.clearCloseTimer();
    this.closeTimer = setTimeout(() => {
      this.closeTimer = undefined;
      if (!this.hovered && this.shadowRoot?.activeElement?.tagName !== 'BUTTON') this.open = false;
    }, 300);
  }
  private trackPointer = (event: PointerEvent) => {
    if (!this.open || this.hovered || this.shadowRoot?.activeElement?.tagName === 'BUTTON') return;
    const trigger = this.renderRoot.querySelector('button')?.getBoundingClientRect();
    const panel = this.renderRoot.querySelector('#tip')?.getBoundingClientRect();
    if (!trigger || !panel) return;
    const margin = 8;
    const inBridge =
      event.clientX >= Math.min(trigger.left, panel.left) - margin &&
      event.clientX <= Math.max(trigger.right, panel.right) + margin &&
      event.clientY >= Math.min(trigger.top, panel.top) - margin &&
      event.clientY <= Math.max(trigger.bottom, panel.bottom) + margin;
    if (inBridge) this.clearCloseTimer();
    else if (!this.closeTimer) this.scheduleClose();
  };
  private escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') this.hideTooltip();
  };
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
        position: relative;
      }
      button {
        min-width: 28px;
        min-height: 28px;
        background: transparent;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        box-shadow: var(--_t-edge-glow);
        color: var(--t-accent);
        font-size: 12px;
      }
      [role='tooltip'] {
        position: fixed;
        z-index: 10;
        inset: auto;
        margin: 0;
        overflow: auto;
        width: 220px;
        max-width: calc(100vw - 48px);
        border: var(--t-line-width, 1px) solid var(--t-border);
        padding: 10px 12px;
        background: var(--t-raised);
        color: var(--t-text);
        font-size: 11px;
        box-shadow:
          var(--_t-edge-glow),
          0 5px 20px #0004;
      }
    `,
  ];
  disconnectedCallback() {
    this.hideTooltip();
    this.hovered = false;
    this.cleanup?.();
    this.cleanup = undefined;
    this.removeDocumentListeners();
    super.disconnectedCallback();
  }
  protected updated(changed: PropertyValues) {
    if (!this.isConnected) return;
    const panel = this.renderRoot.querySelector<HTMLElement>('#tip')!;
    if (this.open && !panel.matches(':popover-open')) panel.showPopover();
    if (!this.open && panel.matches(':popover-open')) panel.hidePopover();
    if (this.open && (changed.has('open') || changed.has('placement') || changed.has('message'))) {
      this.cleanup?.();
      this.cleanup = observeFloating(
        this.renderRoot.querySelector('button')!,
        panel,
        this.placement,
      );
      this.listeningDocument = this.ownerDocument;
      this.listeningDocument.addEventListener('keydown', this.escape);
      this.listeningDocument.addEventListener('pointermove', this.trackPointer, true);
    } else if (!this.open) {
      this.cleanup?.();
      this.cleanup = undefined;
      this.removeDocumentListeners();
    }
  }
  private removeDocumentListeners() {
    this.listeningDocument?.removeEventListener('keydown', this.escape);
    this.listeningDocument?.removeEventListener('pointermove', this.trackPointer, true);
    this.listeningDocument = undefined;
  }
  render() {
    return html`<div
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.hideTooltip();
          e.stopPropagation();
        }
      }}
    >
      <button
        type="button"
        part="trigger"
        aria-label=${this.label}
        aria-describedby="tip"
        @focus=${this.showTooltip}
        @blur=${this.scheduleClose}
        @click=${this.showTooltip}
        @mouseenter=${() => {
          this.hovered = true;
          this.showTooltip();
        }}
        @mouseleave=${() => {
          this.hovered = false;
          this.scheduleClose();
        }}
      >
        ?
      </button>
      <div
        part="tooltip"
        id="tip"
        popover="manual"
        role="tooltip"
        ?hidden=${!this.open}
        @mouseenter=${() => {
          this.hovered = true;
          this.showTooltip();
        }}
        @mouseleave=${() => {
          this.hovered = false;
          this.scheduleClose();
        }}
      >
        ${this.message}
      </div>
    </div>`;
  }
}
if (!customElements.get('t-tooltip')) customElements.define('t-tooltip', TTooltip);
declare global {
  interface HTMLElementTagNameMap {
    't-tooltip': TTooltip;
  }
}
