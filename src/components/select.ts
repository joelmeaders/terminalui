import { html, nothing } from 'lit';
import { FormControl, fieldStyles } from '../internal/form-control';
import { fieldSlotStyles, optionalSlotStyles, syncSlot } from '../internal/slots';
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Native select with a reactive options property and standard form participation.
 * @slot start - Leading icon, short prefix, or named action. Inert while disabled.
 * @slot end - Trailing icon, short suffix, or named action. Inert while disabled.
 * @csspart control - Frame around the native select and optional affixes.
 * @csspart select - select element.
 */
export class TSelect extends FormControl {
  static properties = { options: { attribute: false } };
  /** Available choices. Replace this array to update options. */
  options: SelectOption[] = [];
  static styles = [fieldStyles, optionalSlotStyles, fieldSlotStyles];
  protected syncForm() {
    super.syncForm();
    const select = this.control as HTMLSelectElement | null;
    const option = select?.selectedOptions[0];
    this.internals.setFormValue(
      this.isDisabled || !option || option.disabled ? null : option.value,
    );
  }
  render() {
    return html`<label for="control"
        ><span class="label"
          >${this.label}${this.required ? html` <abbr title="required" aria-hidden="true">*</abbr>` : nothing}</span
        >
      </label>
      <div class="field-row" part="control">
        <slot name="start" data-optional @slotchange=${syncSlot} ?inert=${this.isDisabled}></slot>
        <select
          id="control"
          part="select"
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          aria-describedby="help"
          aria-invalid=${this.hasVisibleError ? 'true' : 'false'}
          @input=${this.handleInput}
          @change=${this.handleChange}
        >
          ${this.options.map((o) => html`<option value=${o.value} ?selected=${o.value === this.value} ?disabled=${o.disabled}>${o.label}</option>`)}
        </select>
        <slot name="end" data-optional @slotchange=${syncSlot} ?inert=${this.isDisabled}></slot>
      </div>
      ${this.renderDescription()}`;
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
