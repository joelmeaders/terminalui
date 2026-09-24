import { css, html, nothing, type PropertyValues } from 'lit';
import { TRadioGroup } from './radio-group';

/** Rating from native radio options. Empty string means unrated. Selected values are integer strings.
 * @csspart clear - Optional clear action.
 */
export class TRating extends TRadioGroup {
  static properties = {
    ...TRadioGroup.properties,
    max: { type: Number },
    clearable: { type: Boolean },
  };
  label = 'Rating';
  /** Number of choices, clamped to 1–10. */
  max = 5;
  /** Show an action that removes the rating. Required ratings become invalid when cleared. */
  clearable = false;
  orientation: 'vertical' | 'horizontal' = 'horizontal';
  static styles = [
    ...TRadioGroup.styles,
    css`
      .options {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 8px;
      }
      label {
        min-height: 32px;
        padding: 4px 8px;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
      }
      label:has(input:checked) {
        font-weight: 700;
        background: var(--t-raised);
      }
      .star {
        color: var(--t-accent);
      }
      button {
        margin-top: 8px;
        min-height: 32px;
        min-width: 32px;
        padding: 5px 10px;
        font-size: 12px;
        color: var(--t-text);
        background: var(--t-raised);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
      }
      @media (forced-colors: active) {
        label {
          border-color: ButtonText;
        }
      }
    `,
  ];
  protected willUpdate(changed: PropertyValues) {
    if (changed.has('max')) {
      const count = Math.max(1, Math.min(10, Math.floor(this.max) || 5));
      this.options = Array.from({ length: count }, (_, index) => ({
        value: String(index + 1),
        label: `${index + 1} of ${count} stars`,
      }));
    }
  }
  /** Remove the selected rating and emit standard input/change events. */
  clear() {
    if (this.isDisabled || !this.value) return;
    this.value = '';
    this.renderRoot.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      input.checked = false;
    });
    this.invalid = false;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    this.focus();
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
                  name="rating"
                  value=${option.value}
                  .checked=${this.value === option.value}
                  ?disabled=${this.isDisabled || option.disabled}
                  ?required=${this.required}
                  aria-describedby="help"
                  aria-invalid=${this.hasVisibleError ? 'true' : 'false'}
                  @input=${this.handleInput}
                  @change=${this.handleChange}
                /><span class="star" aria-hidden="true">★ ${option.value}</span
                ><span class="visually-hidden">${option.label}</span></label
              >`,
          )}
        </div>
      </fieldset>
      ${this.clearable ? html`<button type="button" part="clear" ?disabled=${this.isDisabled || !this.value} @click=${this.clear} aria-label=${`Clear ${this.label || 'rating'}`}>Clear rating</button>` : nothing}
      ${this.renderDescription()}`;
  }
}
if (!customElements.get('t-rating')) customElements.define('t-rating', TRating);
declare global {
  interface HTMLElementTagNameMap {
    't-rating': TRating;
  }
}
