import { css, html, nothing, type PropertyValues } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
/**
 * A native scalar measurement. Use progress for task completion.
 *
 * @csspart meter - Native meter element.
 *
 * @csspart label - Visible measurement label.
 */
export class TMeter extends TerminalElement {
  static properties = {
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    low: { type: Number },
    high: { type: Number },
    optimum: { type: Number },
    label: {},
    valueText: { attribute: 'value-text' },
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
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
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
      meter {
        display: block;
        width: 100%;
        height: 12px;
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
      @media (forced-colors: active) {
        meter {
          appearance: auto;
        }
      }
    `,
  ];
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
    return html`<label for="measurement"
        ><span class="label" part="label"
          ><span>${this.label}</span
          ><span class="value" aria-hidden="true"
            >${this.valueText || `${this.value} / ${this.max}`}</span
          ></span
        ></label
      ><meter
        id="measurement"
        part="meter"
        min=${this.min}
        max=${this.max}
        value=${this.value}
        low=${this.low ?? nothing}
        high=${this.high ?? nothing}
        optimum=${this.optimum ?? nothing}
        aria-valuetext=${this.valueText || nothing}
      ></meter>`;
  }
}
if (!customElements.get('t-meter')) customElements.define('t-meter', TMeter);
declare global {
  interface HTMLElementTagNameMap {
    't-meter': TMeter;
  }
}
