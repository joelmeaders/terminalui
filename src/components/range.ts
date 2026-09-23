import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { FormControl, fieldStyles } from '../internal/form-control';

/** Native slider with keyboard support and a visible numeric value. */
export class TRange extends FormControl {
  static properties = {
    min: { type: Number },
    max: { type: Number },
    step: {},
    showValue: { type: Boolean, attribute: 'show-value' },
  };
  value = '50';
  min = 0;
  max = 100;
  /** Numeric increment or any. */
  step = '1';
  /** Show the current value beside the label. */
  showValue = true;
  static styles = [
    fieldStyles,
    css`
      input {
        padding: 0;
        border: 0;
        box-shadow: none;
        background: transparent;
      }
      .label {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      output {
        color: var(--t-accent);
      }
    `,
  ];
  protected updated(changed: PropertyValues) {
    // Read back native clamping and step normalization.
    if (this.control && this.value !== this.control.value) this.value = this.control.value;
    super.updated(changed);
  }
  formResetCallback() {
    super.formResetCallback();
    if (this.control) this.value = this.control.value;
    this.syncForm();
  }
  render() {
    return html`<label for="range" class="label"
        ><span>${this.label}</span
        >${this.showValue ? html`<output for="range">${this.value}</output>` : ''}</label
      >
      <input
        id="range"
        part="input"
        type="range"
        min=${this.min}
        max=${this.max}
        step=${this.step}
        .value=${this.value}
        ?disabled=${this.isDisabled}
        aria-describedby="help"
        aria-invalid=${this.invalid || !!this.error ? 'true' : 'false'}
        @input=${this.handleInput}
        @change=${this.handleChange}
      />
      <p id="help" class="help ${this.invalid || this.error ? 'error' : ''}">
        ${this.error || (this.invalid ? this.validationMessage : this.help)}
      </p>`;
  }
}
if (!customElements.get('t-range')) customElements.define('t-range', TRange);
declare global {
  interface HTMLElementTagNameMap {
    't-range': TRange;
  }
}
