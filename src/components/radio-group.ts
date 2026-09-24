import { css, html, nothing } from 'lit';
import { FormControl, fieldStyles } from '../internal/form-control';
import type { SelectOption } from './select';

/**
 * Form-associated native radio group. Arrow keys move between enabled options.
 * @csspart input - input element.
 */
export class TRadioGroup extends FormControl {
  static properties = { options: { attribute: false }, orientation: { reflect: true } };
  /** Choices. Replace the array to update options. Each value must be unique. */
  options: SelectOption[] = [];
  orientation: 'vertical' | 'horizontal' = 'vertical';
  static styles = [
    fieldStyles,
    css`
      fieldset {
        border: 0;
        padding: 0;
        margin: 0;
        min-width: 0;
      }
      legend {
        padding: 0;
        font-size: 12px;
        margin-bottom: 8px;
      }
      .options {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      :host([orientation='horizontal']) .options {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 16px;
      }
      label {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 32px;
      }
      input {
        margin: 0;
        width: 18px;
        height: 18px;
        min-height: 0;
        padding: 0;
        flex: none;
      }
    `,
  ];
  protected get control() {
    return (
      this.renderRoot?.querySelector<HTMLInputElement>('input:checked:not(:disabled)') ??
      this.renderRoot?.querySelector<HTMLInputElement>('input:not(:disabled)') ??
      this.renderRoot?.querySelector<HTMLInputElement>('input') ??
      null
    );
  }
  protected syncForm() {
    super.syncForm();
    const selected = this.options.find((option) => option.value === this.value && !option.disabled);
    this.internals.setFormValue(!this.isDisabled && selected ? this.value : null);
    if (!this.isDisabled && !this.error && !this.customValidationMessage) {
      this.internals.setValidity(
        this.required && !selected ? { valueMissing: true } : {},
        this.required && !selected ? 'Select an option.' : '',
        this.control ?? undefined,
      );
    }
  }
  formResetCallback() {
    this.value = this.getAttribute('value') ?? this.initialValue;
    this.renderRoot.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      input.checked = input.value === this.value;
    });
    this.invalid = false;
    this.syncForm();
  }
  render() {
    return html`<fieldset ?disabled=${this.isDisabled}>
        <legend>
          ${this.label}${this.required ? html` <abbr title="required" aria-hidden="true">*</abbr>` : nothing}
        </legend>
        <div class="options">
          ${this.options.map(
            (option) =>
              html`<label
                ><input
                  type="radio"
                  part="input"
                  name="choice"
                  value=${option.value}
                  .checked=${this.value === option.value}
                  ?disabled=${option.disabled || this.isDisabled}
                  ?required=${this.required}
                  aria-describedby="help"
                  aria-invalid=${this.hasVisibleError ? 'true' : 'false'}
                  @input=${this.handleInput}
                  @change=${this.handleChange}
                />${option.label}</label
              >`,
          )}
        </div>
      </fieldset>
      ${this.renderDescription()}`;
  }
}
if (!customElements.get('t-radio-group')) customElements.define('t-radio-group', TRadioGroup);
declare global {
  interface HTMLElementTagNameMap {
    't-radio-group': TRadioGroup;
  }
}
