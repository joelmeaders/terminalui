import { css, html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { FormControl, fieldStyles } from '../internal/form-control';

/** Native file picker. Files participate in FormData. This component does not upload files. */
export class TFileInput extends FormControl {
  static properties = {
    accept: {},
    multiple: { type: Boolean },
    capture: {},
    files: { attribute: false },
  };
  /** Comma-separated file extensions or MIME types. This is a picker hint, not validation. */
  accept = '';
  multiple = false;
  /** Optional device capture hint: user or environment. */
  capture?: string;
  /** Selected files. Assign a FileList from DataTransfer to set files programmatically. */
  files: FileList | null = null;
  static styles = [
    fieldStyles,
    css`
      input::file-selector-button {
        font: inherit;
        padding: 5px 10px;
        margin-right: 12px;
        color: var(--t-text);
        background: var(--t-raised);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
      }
    `,
  ];
  protected syncForm() {
    const input = this.control as HTMLInputElement | null;
    if (!input) return;
    if (this.files !== input.files) {
      if (this.files) input.files = this.files;
      else input.value = '';
    }
    this.value = input.value;
    super.syncForm();
    if (this.isDisabled || !this.name) {
      this.internals.setFormValue(null);
      return;
    }
    const data = new FormData();
    if (this.files?.length) {
      Array.from(this.files).forEach((file) => data.append(this.name, file));
    } else data.append(this.name, new File([], '', { type: 'application/octet-stream' }));
    this.internals.setFormValue(data);
  }
  protected handleInput(event: Event) {
    event.stopPropagation();
    this.files = (event.target as HTMLInputElement).files;
    this.invalid = false;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }
  formResetCallback() {
    this.files = null;
    this.value = '';
    this.invalid = false;
    this.syncForm();
  }
  formStateRestoreCallback() {
    // Browsers cannot restore a user's file selection safely.
    this.formResetCallback();
  }
  render() {
    return html`<label
        ><span class="label"
          >${this.label}${this.required ? html` <abbr title="required" aria-hidden="true">*</abbr>` : nothing}</span
        >
        <input
          part="input"
          type="file"
          accept=${this.accept}
          capture=${ifDefined(this.capture)}
          ?multiple=${this.multiple}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          aria-describedby="help"
          aria-invalid=${this.hasVisibleError ? 'true' : 'false'}
          @input=${this.handleInput}
          @change=${this.handleChange}
      /></label>
      ${this.renderDescription()}`;
  }
}
if (!customElements.get('t-file-input')) customElements.define('t-file-input', TFileInput);
declare global {
  interface HTMLElementTagNameMap {
    't-file-input': TFileInput;
  }
}
