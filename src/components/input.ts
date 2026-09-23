import { html, nothing } from 'lit';
import { FormControl, fieldStyles } from '../internal/form-control';

/** Form-associated text input. Label and help are associated inside the shadow root. */
export class TInput extends FormControl {
  static properties = {
    type: {},
    placeholder: {},
    autocomplete: {},
    readonly: { type: Boolean, reflect: true },
  };
  type = 'text';
  placeholder = '';
  autocomplete = 'off';
  readonly = false;
  static styles = fieldStyles;
  private onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.isComposing || event.defaultPrevented || !this.form) return;
    const submitter = Array.from(this.form.elements).find(
      (element) =>
        (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) &&
        element.type === 'submit' &&
        !element.disabled,
    ) as HTMLButtonElement | HTMLInputElement | undefined;
    if (submitter) {
      event.preventDefault();
      this.form.requestSubmit(submitter);
    }
  }
  render() {
    const type = ['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(this.type)
      ? this.type
      : 'text';
    return html`<label
        ><span class="label"
          >${this.label}${this.required ? html` <abbr title="required">*</abbr>` : nothing}</span
        >
        <input
          part="input"
          .value=${this.value}
          type=${type}
          placeholder=${this.placeholder}
          autocomplete=${this.autocomplete}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          ?readonly=${this.readonly}
          aria-invalid=${this.invalid || !!this.error ? 'true' : 'false'}
          aria-describedby="help"
          @input=${this.handleInput}
          @change=${this.handleChange}
          @keydown=${this.onKeydown}
        />
      </label>
      <p id="help" class="help ${this.invalid || this.error ? 'error' : ''}">
        ${this.error || (this.invalid ? this.validationMessage : this.help)}
      </p>`;
  }
}
customElements.define('t-input', TInput);
declare global {
  interface HTMLElementTagNameMap {
    't-input': TInput;
  }
}
