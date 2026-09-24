import { css, html, type PropertyValues } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
import { observeFloating, type Placement } from '../internal/floating';
/** Help tooltip with its own named button. Opens on hover/focus/click, dismisses on Escape. */
export class TTooltip extends TerminalElement {
  static properties = { label: {}, message: {}, placement: {}, open: { state: true } };
  label = 'More information';
  message = '';
  placement: Placement = 'top';
  private open = false;
  private cleanup?: () => void;
  private closeTimer?: ReturnType<typeof setTimeout>;
  private hovered = false;
  private showTooltip() {
    clearTimeout(this.closeTimer);
    this.open = true;
  }
  private hideTooltip() {
    clearTimeout(this.closeTimer);
    this.open = false;
  }
  private scheduleClose() {
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      if (!this.hovered && this.shadowRoot?.activeElement?.tagName !== 'BUTTON') this.open = false;
    }, 150);
  }
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
    document.removeEventListener('keydown', this.escape);
    super.disconnectedCallback();
  }
  protected updated(changed: PropertyValues) {
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
      document.addEventListener('keydown', this.escape);
    } else if (!this.open) {
      this.cleanup?.();
      this.cleanup = undefined;
      document.removeEventListener('keydown', this.escape);
    }
  }
  render() {
    return html`<div
      @mouseenter=${() => {
        this.hovered = true;
        this.showTooltip();
      }}
      @mouseleave=${() => {
        this.hovered = false;
        this.scheduleClose();
      }}
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
      >
        ?
      </button>
      <div part="tooltip" id="tip" popover="manual" role="tooltip" ?hidden=${!this.open}>
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
