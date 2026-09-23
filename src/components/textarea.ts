import { css, html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { FormControl, fieldStyles } from '../internal/form-control';

/** Multiline native text field with form participation and constraint validation. */
export class TTextarea extends FormControl {
  static properties = {
    placeholder: {},
    rows: { type: Number },
    minlength: { type: Number },
    maxlength: { type: Number },
    readonly: { type: Boolean, reflect: true },
    resize: { reflect: true },
    autocomplete: {},
  };
  placeholder = '';
  /** Initial visible line count. */
  rows = 4;
  minlength?: number;
  maxlength?: number;
  readonly = false;
  /** Allowed resize direction: vertical, horizontal, both, or none. */
  resize = 'vertical';
  autocomplete = 'off';
  static styles = [
    fieldStyles,
    css`
      textarea {
        resize: vertical;
      }
      :host([resize='none']) textarea {
        resize: none;
      }
      :host([resize='both']) textarea {
        resize: both;
      }
      :host([resize='horizontal']) textarea {
        resize: horizontal;
      }
    `,
  ];
  render() {
    return html`<label
        ><span class="label"
          >${this.label}${this.required ? html` <abbr title="required">*</abbr>` : nothing}</span
        >
        <textarea
          part="textarea"
          .value=${this.value}
          rows=${Math.max(1, this.rows)}
          placeholder=${this.placeholder}
          autocomplete=${this.autocomplete}
          minlength=${ifDefined(this.minlength)}
          maxlength=${ifDefined(this.maxlength)}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          aria-invalid=${this.invalid || !!this.error ? 'true' : 'false'}
          aria-describedby="help"
          @input=${this.handleInput}
          @change=${this.handleChange}
        ></textarea>
      </label>
      <p id="help" class="help ${this.invalid || this.error ? 'error' : ''}">
        ${this.error || (this.invalid ? this.validationMessage : this.help)}
      </p>`;
  }
}
if (!customElements.get('t-textarea')) customElements.define('t-textarea', TTextarea);
declare global {
  interface HTMLElementTagNameMap {
    't-textarea': TTextarea;
  }
}
