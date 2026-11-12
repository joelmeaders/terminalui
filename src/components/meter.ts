import { css, html, nothing, type PropertyValues } from 'lit';
import { baseStyles, HullframeElement } from '../internal/base';

export type MeterVariant = 'solid' | 'segmented-thin' | 'segmented-thick';
export type MeterSize = 'small' | 'medium' | 'large';
/**
 * A native scalar measurement. Use progress for task completion.
 *
 * @csspart meter - Native meter element.
 *
 * @csspart label - Visible measurement label.
 * @csspart fill - Decorative fill used by segmented, enlarged, or animated meters.
 * @cssprop --t-meter-duration - Entrance duration. Defaults to three times --t-motion-slow (720ms).
 */
export class TMeter extends HullframeElement {
  static properties = {
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    low: { type: Number },
    high: { type: Number },
    optimum: { type: Number },
    label: {},
    valueText: { attribute: 'value-text' },
    variant: { reflect: true },
    size: { reflect: true },
    animated: { type: Boolean, reflect: true },
    phase: { state: true },
  };
  /** Current measurement, clamped to the range. */
  value = 0;
  /** Minimum measurement. */
  min = 0;
  /** Maximum measurement; must exceed min. */
  max = 100;
  /** Optional lower threshold within the range. */
  low?: number;
  /** Optional upper threshold within the range. */
  high?: number;
  /** Optional optimal measurement within the range. */
  optimum?: number;
  /** Accessible and visible measurement name. */
  label = 'Measurement';
  /** Optional formatted value, shown visually and exposed through aria-valuetext. */
  valueText = '';
  /** Solid, thin segments, or thick segments. Unknown values use solid. */
  variant: MeterVariant = 'solid';
  /** Track height: small 12px, medium 20px, large 32px. Unknown values use small. */
  size: MeterSize = 'small';
  /** Reveal once on viewport entry per connection. Motion preferences take priority. */
  animated = false;
  private phase: 'pending' | 'entering' | 'complete' = 'complete';
  private entered = false;
  private observer?: IntersectionObserver;
  private motionQuery?: MediaQueryList;
  private onMotionChange = (event: MediaQueryListEvent) => {
    if (event.matches && this.animated) this.completeEntrance();
  };
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
        --_t-meter-height: 12px;
      }
      :host([size='medium']) {
        --_t-meter-height: 20px;
      }
      :host([size='large']) {
        --_t-meter-height: 32px;
      }
      label {
        display: block;
        overflow-wrap: anywhere;
      }
      .label {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 8px;
      }
      .value {
        color: var(--t-muted);
      }
      .track {
        position: relative;
      }
      meter {
        display: block;
        width: 100%;
        height: var(--_t-meter-height);
        appearance: none;
        border: var(--t-line-width, 1px) solid var(--t-control-border);
        border-radius: 0;
        background: var(--t-raised);
        accent-color: var(--t-accent);
      }
      meter::-webkit-meter-bar {
        border: 0;
        border-radius: 0;
        background: var(--t-raised);
      }
      meter::-webkit-meter-optimum-value,
      meter::-webkit-meter-suboptimum-value,
      meter::-webkit-meter-even-less-good-value {
        border-radius: 0;
        background: var(--t-accent);
      }
      meter::-moz-meter-bar {
        background: var(--t-accent);
      }
      meter[data-custom]::-webkit-meter-optimum-value,
      meter[data-custom]::-webkit-meter-suboptimum-value,
      meter[data-custom]::-webkit-meter-even-less-good-value {
        background: transparent;
      }
      meter[data-custom]::-moz-meter-bar {
        background: transparent;
      }
      .visual {
        position: absolute;
        inset: var(--t-line-width, 1px);
        overflow: hidden;
        pointer-events: none;
      }
      .fill {
        position: absolute;
        inset-block: 0;
        inset-inline-start: 0;
        background: var(--t-accent);
      }
      .segmented-thin {
        background: repeating-linear-gradient(90deg, var(--t-accent) 0 2px, transparent 2px 4px);
      }
      .segmented-thick {
        background: repeating-linear-gradient(90deg, var(--t-accent) 0 6px, transparent 6px 9px);
      }
      .visual[data-phase='pending'] .fill,
      .visual[data-phase='entering'] .fill {
        animation: var(--_t-motion-name, meter-enter)
          var(--_t-motion-duration, var(--t-meter-duration, calc(var(--t-motion-slow, 240ms) * 3)))
          var(--t-motion-ease, ease) both;
      }
      .visual[data-phase='pending'] .fill {
        animation-play-state: paused;
      }
      :host(:dir(rtl)) .visual:not([data-phase='complete']) .fill {
        animation-name: var(--_t-motion-name, meter-enter-rtl);
      }
      @keyframes meter-enter {
        from {
          clip-path: inset(0 100% 0 0);
        }
        to {
          clip-path: inset(0);
        }
      }
      @keyframes meter-enter-rtl {
        from {
          clip-path: inset(0 0 0 100%);
        }
        to {
          clip-path: inset(0);
        }
      }
      @media (forced-colors: active) {
        meter {
          appearance: auto;
        }
        meter[data-custom]::-webkit-meter-optimum-value,
        meter[data-custom]::-webkit-meter-suboptimum-value,
        meter[data-custom]::-webkit-meter-even-less-good-value {
          background: Highlight;
        }
        meter[data-custom]::-moz-meter-bar {
          background: Highlight;
        }
        .visual {
          display: none;
        }
        .fill {
          animation: none !important;
        }
      }
    `,
  ];
  connectedCallback() {
    super.connectedCallback();
    this.entered = false;
    if (typeof matchMedia === 'function') {
      this.motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
      this.motionQuery.addEventListener('change', this.onMotionChange);
    }
    this.prepareEntrance();
  }
  disconnectedCallback() {
    this.motionQuery?.removeEventListener('change', this.onMotionChange);
    this.motionQuery = undefined;
    this.observer?.disconnect();
    this.observer = undefined;
    super.disconnectedCallback();
  }
  protected updated(changed: PropertyValues) {
    if (changed.has('animated')) this.prepareEntrance();
  }
  private prepareEntrance() {
    this.observer?.disconnect();
    this.observer = undefined;
    if (!this.animated || this.entered) {
      this.phase = 'complete';
      return;
    }
    if (this.motionQuery?.matches) {
      this.completeEntrance();
      return;
    }
    this.phase = 'pending';
    void this.updateComplete.then(() => {
      if (!this.isConnected || this.phase !== 'pending' || this.observer) return;
      if (typeof IntersectionObserver === 'undefined') {
        this.completeEntrance();
        return;
      }
      this.observer = new IntersectionObserver((entries) => {
        if (!this.isConnected || !this.animated || this.entered) return;
        if (
          !entries.some(
            (entry) =>
              entry.isIntersecting &&
              entry.intersectionRect.width > 0 &&
              entry.intersectionRect.height > 0,
          )
        )
          return;
        this.observer?.disconnect();
        this.observer = undefined;
        this.entered = true;
        const fill = this.renderRoot.querySelector('.fill');
        const style = fill && getComputedStyle(fill);
        this.phase =
          style && style.animationName !== 'none' && parseFloat(style.animationDuration) > 0
            ? 'entering'
            : 'complete';
      });
      this.observer.observe(this);
    });
  }
  private completeEntrance() {
    this.observer?.disconnect();
    this.observer = undefined;
    this.entered = true;
    this.phase = 'complete';
  }
  private finishEntrance() {
    if (this.phase === 'entering') this.phase = 'complete';
  }
  protected willUpdate(_changed: PropertyValues) {
    this.min = Number.isFinite(this.min) ? this.min : 0;
    this.max = Number.isFinite(this.max) && this.max > this.min ? this.max : this.min + 1;
    const clamp = (value: number) => Math.max(this.min, Math.min(this.max, value));
    this.value = clamp(Number.isFinite(this.value) ? this.value : this.min);
    if (this.low !== undefined) this.low = Number.isFinite(this.low) ? clamp(this.low) : undefined;
    if (this.high !== undefined)
      this.high = Number.isFinite(this.high)
        ? Math.max(this.low ?? this.min, clamp(this.high))
        : undefined;
    if (this.optimum !== undefined)
      this.optimum = Number.isFinite(this.optimum) ? clamp(this.optimum) : undefined;
  }
  render() {
    const variant =
      this.variant === 'segmented-thin' || this.variant === 'segmented-thick'
        ? this.variant
        : 'solid';
    const custom =
      this.animated || variant !== 'solid' || this.size === 'medium' || this.size === 'large';
    const percent = ((this.value - this.min) / (this.max - this.min)) * 100;
    return html`<label for="measurement"
        ><span class="label" part="label"
          ><span>${this.label}</span
          ><span class="value" aria-hidden="true"
            >${this.valueText || `${this.value} / ${this.max}`}</span
          ></span
        ></label
      >
      <div class="track">
        <meter
          id="measurement"
          part="meter"
          min=${this.min}
          max=${this.max}
          value=${this.value}
          low=${this.low ?? nothing}
          high=${this.high ?? nothing}
          optimum=${this.optimum ?? nothing}
          aria-valuetext=${this.valueText || nothing}
          data-custom=${custom ? '' : nothing}
        ></meter
        >${
          custom
            ? html`<div class="visual" aria-hidden="true" data-phase=${this.phase}>
                <div
                  class="fill ${variant}"
                  part="fill"
                  style=${`width:${percent}%`}
                  @animationend=${this.finishEntrance}
                  @animationcancel=${this.finishEntrance}
                ></div>
              </div>`
            : nothing
        }
      </div>`;
  }
}
if (!customElements.get('t-meter')) customElements.define('t-meter', TMeter);
declare global {
  interface HTMLElementTagNameMap {
    't-meter': TMeter;
  }
}
