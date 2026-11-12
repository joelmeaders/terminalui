import { css, html, nothing, type PropertyValues } from 'lit';
import { baseStyles, HullframeElement } from '../internal/base';
import { activeElement, recoverFocus } from '../internal/floating';
import { optionalSlotStyles, syncSlot } from '../internal/slots';
/**
 * Polite dismissible notification. Duration defaults to zero (persistent); timers pause on hover, focus, or hidden pages.
 *
 * @slot - Optional content instead of message.
 * @slot icon - Optional decorative status icon.
 * @slot actions - Named notification actions. Focus pauses auto-dismiss. Hidden when closed.
 *
 * @fires {CustomEvent<{ reason: 'dismiss' | 'timeout' | 'programmatic' }>} t-close - The notification closed with its dismissal reason.
 *
 * @csspart notice - Notification surface.
 *
 * @csspart close - Dismiss button.
 *
 * @csspart countdown - Countdown bar or spinner container.
 *
 * @csspart countdown-bar - Shrinking bar fill.
 *
 * @csspart countdown-ring - Rotating spinner ring.
 *
 * @csspart countdown-value - Remaining time inside the spinner.
 */
export class TToast extends HullframeElement {
  static properties = {
    message: {},
    open: { type: Boolean, reflect: true },
    variant: { reflect: true },
    duration: { type: Number },
    urgent: { type: Boolean },
    countdown: { reflect: true },
    countdownUnit: { attribute: 'countdown-unit' },
    displayedRemaining: { state: true },
    paused: { state: true },
    hasMessageContent: { state: true },
  };
  message = '';
  open = false;
  variant = 'info';
  duration = 0;
  urgent = false;
  /** Optional visual indicator for a positive duration. Does not enable a timeout by itself. */
  countdown: 'none' | 'bar' | 'spinner' = 'none';
  /** Unit displayed inside the spinner. Duration always uses milliseconds. */
  countdownUnit: 'seconds' | 'milliseconds' = 'seconds';
  private displayedRemaining = 0;
  private paused = false;
  private hasMessageContent = false;
  private contentObserver = new MutationObserver(() => this.syncMessageContent());
  private listeningDocument?: Document;
  private frame?: number;
  private nextPaint = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private remaining = 0;
  private started = 0;
  private hovered = false;
  private focused = false;
  private restoreFocus = false;
  private closeFocus?: HTMLElement;
  private opener?: HTMLElement;
  private reason: 'dismiss' | 'timeout' | 'programmatic' = 'programmatic';
  // show() must restart even when no public property changes.
  private restartRequested = false;
  static styles = [
    baseStyles,
    optionalSlotStyles,
    css`
      :host {
        display: block;
      }
      .notice {
        --_t-toast-accent: var(--t-accent);
        position: relative;
        animation: var(--_t-motion-name, t-enter)
          var(--_t-motion-duration, var(--t-motion-normal, 180ms)) var(--t-motion-ease, ease);
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 16px;
        background: var(--t-raised);
        color: var(--t-text);
        border: var(--t-line-width, 1px) solid var(--t-border);
        border-left: var(--t-emphasis-width, 3px) solid var(--_t-toast-accent);
        box-shadow: var(--_t-edge-glow);
        font-size: 13px;
      }
      :host([variant='success']) .notice {
        --_t-toast-accent: var(--t-success);
      }
      :host([variant='warning']) .notice {
        --_t-toast-accent: var(--t-warning);
      }
      :host([variant='danger']) .notice {
        --_t-toast-accent: var(--t-danger);
      }
      .notice:not([data-open]) {
        display: contents;
      }
      .message {
        flex: 1;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .notice:has(slot[name='actions'][data-filled]) .message {
        flex-basis: 12ch;
        min-width: min(12ch, 100%);
      }
      .countdown-bar {
        position: absolute;
        inset: auto 0 0;
        height: var(--t-emphasis-width, 3px);
        background: var(--t-bg);
      }
      .countdown-bar > span {
        display: block;
        height: 100%;
        background: var(--_t-toast-accent);
        transform: scaleX(var(--_t-countdown-progress));
        transform-origin: left;
      }
      .countdown-spinner {
        display: grid;
        place-items: center;
        flex: none;
        width: var(--_t-countdown-size);
        aspect-ratio: 1;
        position: relative;
        font-variant-numeric: tabular-nums;
        line-height: 1.2;
        text-align: center;
      }
      .countdown-ring {
        position: absolute;
        inset: 0;
        border: var(--t-selection-width, 2px) solid var(--t-border);
        border-top-color: var(--_t-toast-accent);
        border-radius: 50%;
        animation: var(--_t-motion-name, countdown-spin) 900ms linear infinite;
      }
      [part='countdown-value'] {
        position: relative;
        z-index: 1;
        padding: 2px;
        background: var(--t-raised);
      }
      .countdown-unit {
        display: block;
        font-size: 0.8em;
      }
      @keyframes countdown-spin {
        to {
          transform: rotate(360deg);
        }
      }
      @media (forced-colors: active) {
        .countdown-bar > span {
          background: CanvasText;
        }
        .countdown-ring {
          border-color: GrayText;
          border-top-color: CanvasText;
        }
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
    this.syncMessageContent();
    this.contentObserver.observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['slot'],
    });
    this.listeningDocument = this.ownerDocument;
    this.listeningDocument.addEventListener('visibilitychange', this.visibility);
    if (this.open) {
      this.restartRequested = true;
      this.requestUpdate();
    }
  }
  disconnectedCallback() {
    this.contentObserver.disconnect();
    clearTimeout(this.timer);
    this.timer = undefined;
    this.stopDisplay();
    this.hovered = this.focused = false;
    this.listeningDocument?.removeEventListener('visibilitychange', this.visibility);
    this.listeningDocument = undefined;
    this.closeFocus = undefined;
    super.disconnectedCallback();
  }
  private syncMessageContent() {
    // Formatting whitespace between named slots must not hide the message fallback.
    this.hasMessageContent = Array.from(this.childNodes).some((node) =>
      node.nodeType === Node.ELEMENT_NODE
        ? !(node as Element).getAttribute('slot')
        : node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim(),
    );
  }
  /** Restart on the next component update. Pass an opener for reliable focus return after pointer activation in Safari. */
  show(message?: string, opener?: HTMLElement) {
    if (message !== undefined) this.message = message;
    this.opener = opener ?? activeElement(this.ownerDocument);
    this.open = true;
    this.restartRequested = true;
    this.requestUpdate();
  }
  close(reason: 'dismiss' | 'timeout' | 'programmatic' = 'programmatic') {
    this.reason = reason;
    this.open = false;
  }
  protected willUpdate(changed: PropertyValues) {
    // Hiding the notice can fire blur before updated() runs, notably in WebKit.
    if (changed.has('open') && !this.open) {
      this.restoreFocus = this.focused;
      this.closeFocus = this.restoreFocus ? activeElement(this.ownerDocument) : undefined;
      clearTimeout(this.timer);
      this.timer = undefined;
      this.stopDisplay();
      this.paused = false;
    } else if (
      this.restartRequested ||
      changed.has('open') ||
      changed.has('duration') ||
      changed.has('message')
    )
      this.restart();
    else if (changed.has('countdown') || changed.has('countdownUnit')) this.startDisplay();
    this.restartRequested = false;
  }
  protected updated(changed: PropertyValues) {
    if (changed.has('open') && !this.open) {
      if (this.restoreFocus && this.ownerDocument.hasFocus())
        recoverFocus(this.closeFocus, this.opener);
      this.restoreFocus = false;
      this.closeFocus = undefined;
      this.hovered = this.focused = false;
      if (changed.get('open') === true) this.emit('t-close', { reason: this.reason });
      this.reason = 'programmatic';
    }
  }
  private get timeoutDuration() {
    // Browsers overflow larger setTimeout delays. Zero and invalid values stay persistent.
    return Number.isFinite(this.duration) ? Math.min(2_147_483_647, Math.max(0, this.duration)) : 0;
  }
  private timeLeft() {
    return this.timer === undefined
      ? this.remaining
      : Math.max(0, this.remaining - (performance.now() - this.started));
  }
  private stopDisplay() {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
  }
  private startDisplay() {
    this.stopDisplay();
    this.displayedRemaining = this.timeLeft();
    this.nextPaint = 0;
    if (this.timer !== undefined && (this.countdown === 'bar' || this.countdown === 'spinner'))
      this.frame = requestAnimationFrame(this.paintCountdown);
  }
  private paintCountdown = (now: number) => {
    // The timeout and indicator use the same elapsed time, rather than counting ticks.
    if (now >= this.nextPaint) {
      const left = this.timeLeft();
      const reduced =
        (this.ownerDocument.defaultView ?? window).matchMedia('(prefers-reduced-motion: reduce)')
          .matches || getComputedStyle(this).getPropertyValue('--_t-motion-name').trim() === 'none';
      this.displayedRemaining = left;
      this.nextPaint = now + (reduced ? 1000 : 32);
    }
    this.frame = requestAnimationFrame(this.paintCountdown);
  };
  private restart() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.stopDisplay();
    this.remaining = this.timeoutDuration;
    this.displayedRemaining = this.remaining;
    this.resume();
  }
  private pause() {
    if (this.timer !== undefined) {
      this.remaining = this.timeLeft();
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.paused = true;
    this.displayedRemaining = this.remaining;
    this.stopDisplay();
  }
  private resume() {
    if (
      !this.open ||
      !this.isConnected ||
      this.hovered ||
      this.focused ||
      this.ownerDocument.hidden ||
      this.remaining <= 0 ||
      this.timer !== undefined
    ) {
      this.paused = this.hovered || this.focused || this.ownerDocument.hidden;
      return;
    }
    this.paused = false;
    this.started = performance.now();
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.remaining = this.displayedRemaining = 0;
      this.stopDisplay();
      this.close('timeout');
    }, this.remaining);
    this.startDisplay();
  }
  private visibility = () => {
    if (this.ownerDocument.hidden) this.pause();
    else this.resume();
  };
  render() {
    const timed = this.timeoutDuration > 0;
    const milliseconds = this.countdownUnit === 'milliseconds';
    const value = Math.ceil(this.displayedRemaining / (milliseconds ? 1 : 1000));
    const digits = String(Math.ceil(this.timeoutDuration / (milliseconds ? 1 : 1000))).length;
    const indicator =
      timed && this.countdown === 'bar'
        ? html`<div
            class="countdown-bar"
            part="countdown"
            aria-hidden="true"
            ?hidden=${!this.open}
            style=${`--_t-countdown-progress:${this.displayedRemaining / this.timeoutDuration}`}
          >
            <span part="countdown-bar"></span>
          </div>`
        : timed && this.countdown === 'spinner'
          ? html`<div
              class="countdown-spinner"
              part="countdown"
              aria-hidden="true"
              ?hidden=${!this.open}
              style=${`--_t-countdown-size:${Math.max(3.5, digits * 0.65 + 1.5)}em`}
            >
              <span
                class="countdown-ring"
                part="countdown-ring"
                style=${`animation-play-state:${this.paused ? 'paused' : 'running'}`}
              ></span>
              <span part="countdown-value"
                >${value}<span class="countdown-unit">${milliseconds ? 'ms' : 's'}</span></span
              >
            </div>`
          : nothing;
    return html`<div>
      <div
        class="notice"
        part="notice"
        ?data-open=${this.open}
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
        <slot
          name="icon"
          data-optional
          aria-hidden="true"
          inert
          ?hidden=${!this.open}
          @slotchange=${syncSlot}
        ></slot>
        <span class="message" role=${this.urgent ? 'alert' : 'status'} aria-atomic="true"
          ><span ?hidden=${!this.open}
            ><slot></slot>${this.hasMessageContent ? nothing : this.message}</span
          ></span
        >
        <slot name="actions" data-optional ?hidden=${!this.open} @slotchange=${syncSlot}></slot>
        ${indicator}<button
          part="close"
          type="button"
          ?hidden=${!this.open}
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
