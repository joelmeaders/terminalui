import { html, nothing } from 'lit';
import { FormControl, fieldStyles } from '../internal/form-control';
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** Native select with a reactive options property and standard form participation. */
export class TSelect extends FormControl {
  static properties = { options: { attribute: false } };
  /** Available choices. Replace this array to update options. */
  options: SelectOption[] = [];
  static styles = fieldStyles;
  protected syncForm() {
    super.syncForm();
    const select = this.control as HTMLSelectElement | null;
    const option = select?.selectedOptions[0];
    this.internals.setFormValue(
      this.isDisabled || !option || option.disabled ? null : option.value,
    );
  }
  render() {
    return html`<label
        ><span class="label"
          >${this.label}${this.required ? html` <abbr title="required">*</abbr>` : nothing}</span
        >
        <select
          part="select"
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          aria-describedby="help"
          aria-invalid=${this.invalid || !!this.error ? 'true' : 'false'}
          @input=${this.handleInput}
          @change=${this.handleChange}
        >
          ${this.options.map((o) => html`<option value=${o.value} ?selected=${o.value === this.value} ?disabled=${o.disabled}>${o.label}</option>`)}
        </select></label
      >
      <p id="help" class="help ${this.invalid || this.error ? 'error' : ''}">
        ${this.error || (this.invalid ? this.validationMessage : this.help)}
      </p>`;
  }
  protected updated(changed: Map<PropertyKey, unknown>) {
    const select = this.control as HTMLSelectElement;
    select.value = this.value;
    super.updated(changed);
  }
}
if (!customElements.get('t-select')) customElements.define('t-select', TSelect);
declare global {
  interface HTMLElementTagNameMap {
    't-select': TSelect;
  }
}
