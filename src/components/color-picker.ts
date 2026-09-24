import { css, html, nothing } from 'lit';
import { FormControl, fieldStyles } from '../internal/form-control';

export interface ColorSwatch {
  value: string;
  label?: string;
}
const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

/**
 * Native color chooser with an editable six-digit hexadecimal value and optional named swatches.
 * Empty values are permitted unless required. Invalid text remains visible and fails form validation.
 *
 * @csspart input - Hexadecimal text entry.
 *
 * @csspart picker - Native color chooser.
 *
 * @csspart swatch - Named preset button.
 */
export class TColorPicker extends FormControl {
  static properties = {
    swatches: { attribute: false },
    readonly: { type: Boolean, reflect: true },
  };
  label = 'Color';
  value = '#f5ba5b';
  help = 'Enter a six-digit color, such as #f5ba5b.';
  /** Optional named presets. Invalid color values are ignored. */
  swatches: ColorSwatch[] = [];
  readonly = false;
  static styles = [
    fieldStyles,
    css`
      .fields {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 48px;
        align-items: stretch;
        gap: 8px;
      }
      input[type='color'] {
        width: 48px;
        padding: 4px;
      }
      .swatches {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }
      button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 32px;
        min-height: 32px;
        max-width: 100%;
        padding: 5px 8px;
        color: var(--t-text);
        background: var(--t-raised);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        font-size: 12px;
        text-align: left;
        overflow-wrap: anywhere;
      }
      .preview {
        display: inline-block;
        width: 16px;
        height: 16px;
        flex: none;
        border: 1px solid var(--t-control-border, var(--t-border));
      }
      button[aria-pressed='true'] {
        outline: 2px solid var(--t-focus);
        outline-offset: 2px;
      }
      @media (forced-colors: active) {
        .preview {
          forced-color-adjust: none;
        }
      }
    `,
  ];
  protected get control() {
    return this.renderRoot?.querySelector<HTMLInputElement>('#hex') ?? null;
  }
  protected syncForm() {
    super.syncForm();
    if (this.isDisabled || this.error || this.customValidationMessage) return;
    const malformed = !!this.value && !isHexColor(this.value);
    if (malformed)
      this.internals.setValidity(
        { patternMismatch: true },
        'Enter a color with # and six hexadecimal digits.',
        this.control ?? undefined,
      );
  }
  private selectColor(value: string) {
    if (this.isDisabled || this.readonly) return;
    this.value = value;
    if (this.control) this.control.value = value;
    this.invalid = false;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }
  private onPickerInput(event: Event) {
    event.stopPropagation();
    this.value = (event.target as HTMLInputElement).value;
    if (this.control) this.control.value = this.value;
    this.invalid = false;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }
  render() {
    return html`<label for="hex" class="label"
        >${this.label}${this.required ? html` <abbr title="required" aria-hidden="true">*</abbr>` : nothing}</label
      >
      <div class="fields">
        <input
          id="hex"
          part="input"
          type="text"
          .value=${this.value}
          pattern="#[0-9a-fA-F]{6}"
          placeholder="#f5ba5b"
          spellcheck="false"
          ?disabled=${this.isDisabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          aria-invalid=${this.hasVisibleError ? 'true' : 'false'}
          aria-describedby="help"
          @input=${this.handleInput}
          @change=${this.handleChange}
        />
        <input
          part="picker"
          type="color"
          .value=${isHexColor(this.value) ? this.value.toLowerCase() : '#000000'}
          aria-label=${`${this.label || 'Color'} picker`}
          ?disabled=${this.isDisabled || this.readonly}
          @input=${this.onPickerInput}
          @change=${this.handleChange}
        />
      </div>
      ${
        this.swatches.length
          ? html`<div
              class="swatches"
              role="group"
              aria-label=${`${this.label || 'Color'} presets`}
            >
              ${this.swatches
                .filter((swatch) => isHexColor(swatch.value))
                .map(
                  (swatch) =>
                    html`<button
                      type="button"
                      part="swatch"
                      ?disabled=${this.isDisabled || this.readonly}
                      aria-pressed=${this.value.toLowerCase() === swatch.value.toLowerCase() ? 'true' : 'false'}
                      @click=${() => this.selectColor(swatch.value.toLowerCase())}
                    >
                      <span
                        class="preview"
                        style=${`background-color:${swatch.value}`}
                        aria-hidden="true"
                      ></span
                      >${swatch.label || swatch.value}
                    </button>`,
                )}
            </div>`
          : nothing
      }
      ${this.renderDescription()}`;
  }
}
if (!customElements.get('t-color-picker')) customElements.define('t-color-picker', TColorPicker);
declare global {
  interface HTMLElementTagNameMap {
    't-color-picker': TColorPicker;
  }
}
