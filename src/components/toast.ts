import { css, html, type PropertyValues } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
import { activeElement } from '../internal/floating';
/** Polite dismissible notification. Duration defaults to zero (persistent); timers pause on hover, focus, or hidden pages.
 * @slot - Optional content instead of message.
 * @fires t-close - CustomEvent<{reason:'dismiss'|'timeout'|'programmatic'}>.
 * @csspart notice - Notification surface.
 * @csspart close - Dismiss button.
 */
export class TToast extends TerminalElement {
  static properties = {
    message: {},
    open: { type: Boolean, reflect: true },
    variant: { reflect: true },
    duration: { type: Number },
    urgent: { type: Boolean },
  };
  message = '';
  open = false;
  variant = 'info';
  duration = 0;
  urgent = false;
  private timer?: ReturnType<typeof setTimeout>;
  private remaining = 0;
  private started = 0;
  private hovered = false;
  private focused = false;
  private restoreFocus = false;
  private opener?: HTMLElement;
  private reason: 'dismiss' | 'timeout' | 'programmatic' = 'programmatic';
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }
      .notice {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 16px;
        background: var(--t-raised);
        color: var(--t-text);
        border: var(--t-line-width, 1px) solid var(--t-border);
        border-left: var(--t-emphasis-width, 3px) solid var(--t-accent);
        box-shadow: var(--_t-edge-glow);
        font-size: 13px;
      }
      :host([variant='success']) .notice {
        border-left-color: var(--t-success);
      }
      :host([variant='warning']) .notice {
        border-left-color: var(--t-warning);
      }
      :host([variant='danger']) .notice {
        border-left-color: var(--t-danger);
      }
      button {
        flex: none;
        min-width: 32px;
        min-height: 32px;
        border: 0;
        color: var(--t-text);
        background: transparent;
        font-size: 22px;
      }
    `,
  ];
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this.visibility);
    if (this.open) this.restart();
  }
  disconnectedCallback() {
    clearTimeout(this.timer);
    this.timer = undefined;
    document.removeEventListener('visibilitychange', this.visibility);
    super.disconnectedCallback();
  }
  /** Pass an opener for reliable focus return after pointer activation in Safari. */
  show(message?: string, opener?: HTMLElement) {
    if (message !== undefined) this.message = message;
    this.opener = opener ?? activeElement();
    this.open = true;
    this.restart();
  }
  close(reason: 'dismiss' | 'timeout' | 'programmatic' = 'programmatic') {
    this.reason = reason;
    this.open = false;
  }
  protected willUpdate(changed: PropertyValues) {
    // Hiding the notice can fire blur before updated() runs, notably in WebKit.
    if (changed.has('open') && !this.open) this.restoreFocus = this.focused;
  }
  protected updated(changed: PropertyValues) {
    if (changed.has('open')) {
      if (this.open) this.restart();
      else {
        clearTimeout(this.timer);
        this.timer = undefined;
        if (this.restoreFocus && this.opener?.isConnected) this.opener.focus();
        this.restoreFocus = false;
        if (changed.get('open') === true) this.emit('t-close', { reason: this.reason });
        this.reason = 'programmatic';
      }
    } else if (changed.has('duration') || changed.has('message')) this.restart();
  }
  private restart() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.remaining = Number.isFinite(this.duration) ? Math.max(0, this.duration) : 0;
    this.resume();
  }
  private pause() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
      this.remaining = Math.max(0, this.remaining - (performance.now() - this.started));
    }
  }
  private resume() {
    if (
      !this.open ||
      this.hovered ||
      this.focused ||
      document.hidden ||
      this.remaining <= 0 ||
      this.timer
    )
      return;
    this.started = performance.now();
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.close('timeout');
    }, this.remaining);
  }
  private visibility = () => {
    if (document.hidden) this.pause();
    else this.resume();
  };
  render() {
    return html`<div role=${this.urgent ? 'alert' : 'status'} aria-atomic="true">
      <div
        class="notice"
        part="notice"
        ?hidden=${!this.open}
        @mouseenter=${() => {
          this.hovered = true;
          this.pause();
        }}
        @mouseleave=${() => {
          this.hovered = false;
          this.resume();
        }}
        @focusin=${() => {
          this.focused = true;
          this.pause();
        }}
        @focusout=${() => {
          this.focused = false;
          this.resume();
        }}
      >
        <span><slot>${this.message}</slot></span
        ><button
          part="close"
          type="button"
          aria-label="Dismiss notification"
          @mousedown=${(event: MouseEvent) => event.preventDefault()}
          @click=${() => this.close('dismiss')}
        >
          ×
        </button>
      </div>
    </div>`;
  }
}
if (!customElements.get('t-toast')) customElements.define('t-toast', TToast);
declare global {
  interface HTMLElementTagNameMap {
    't-toast': TToast;
  }
}
