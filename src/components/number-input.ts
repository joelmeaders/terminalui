import { css, html, type PropertyValues } from 'lit';
import { TInput } from './input';
import { recoverFocus } from '../internal/floating';

/**
 * Native number field with named step actions. The submitted value remains a string.
 *
 * @csspart stepper - Step action group.
 *
 * @csspart decrease - Decrease button.
 *
 * @csspart increase - Increase button.
 */
export class TNumberInput extends TInput {
  type = 'number';
  label = 'Number';
  static styles = [
    ...TInput.styles,
    css`
      .stepper {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
      }
      button {
        min-height: 32px;
        min-width: 32px;
        padding: 5px 12px;
        font-size: 13px;
        color: var(--t-text);
        background: var(--t-raised);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
      }
    `,
  ];
  private get atMin() {
    return (
      this.value !== '' &&
      !!this.min &&
      Number.isFinite(Number(this.min)) &&
      Number(this.value) <= Number(this.min)
    );
  }
  private get atMax() {
    return (
      this.value !== '' &&
      !!this.max &&
      Number.isFinite(Number(this.max)) &&
      Number(this.value) >= Number(this.max)
    );
  }
  protected willUpdate(_changed: PropertyValues) {
    this.type = 'number';
  }
  /** Increase by count native steps. With step=any, each step adds one. */
  stepUp(count = 1) {
    this.adjust(count);
  }
  /** Decrease by count native steps. With step=any, each step subtracts one. */
  stepDown(count = 1) {
    this.adjust(-count);
  }
  private adjust(count: number) {
    if (this.isDisabled || this.readonly || !Number.isFinite(count)) return;
    const input = this.control as HTMLInputElement | null;
    if (!input) return;
    const before = input.value;
    if (input.step === 'any') {
      const current = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : 0;
      const lower =
        input.min === '' || !Number.isFinite(Number(input.min)) ? -Infinity : Number(input.min);
      const upper =
        input.max === '' || !Number.isFinite(Number(input.max)) ? Infinity : Number(input.max);
      input.valueAsNumber = Math.min(upper, Math.max(lower, current + count));
    } else input.stepUp(count);
    if (input.value === before) return;
    const action = this.shadowRoot?.activeElement;
    this.value = input.value;
    this.invalid = false;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    if (action instanceof HTMLButtonElement)
      void this.updateComplete.then(() => {
        if (action.disabled) recoverFocus(action, input);
      });
  }
  render() {
    return html`${super.render()}
      <div
        class="stepper"
        part="stepper"
        role="group"
        aria-label=${`${this.label || 'Number'} adjustments`}
      >
        <button
          type="button"
          part="decrease"
          aria-label=${`Decrease ${this.label || 'number'}`}
          ?disabled=${this.isDisabled || this.readonly || this.atMin}
          @click=${() => this.stepDown()}
        >
          −
        </button>
        <button
          type="button"
          part="increase"
          aria-label=${`Increase ${this.label || 'number'}`}
          ?disabled=${this.isDisabled || this.readonly || this.atMax}
          @click=${() => this.stepUp()}
        >
          +
        </button>
      </div>`;
  }
}
if (!customElements.get('t-number-input')) customElements.define('t-number-input', TNumberInput);
declare global {
  interface HTMLElementTagNameMap {
    't-number-input': TNumberInput;
  }
}
