import { css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { TRadioGroup } from './radio-group';
import { activeElement, recoverFocus } from '../internal/floating';

/**
 * Rating from native radio options. Empty string means unrated. Selected values are integer strings.
 * A hidden or disabled clear action recovers focus to an available radio or the disabled group's legend.
 *
 * @csspart clear - Optional clear action.
 * @csspart input - input element.
 */
export class TRating extends TRadioGroup {
  static properties = {
    ...TRadioGroup.properties,
    max: { type: Number },
    clearable: { type: Boolean },
  };
  label = 'Rating';
  /** Number of choices, clamped to 1–10. Live changes retain focus or use the nearest available rating. */
  max = 5;
  /** Show an action that removes the rating. Required ratings become invalid when cleared. */
  clearable = false;
  /** Rating layout. Horizontal is the default; vertical stacks the native choices. */
  orientation: 'vertical' | 'horizontal' = 'horizontal';
  private focusedClear?: HTMLElement;
  static styles = [
    ...TRadioGroup.styles,
    css`
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
    const from = this.shadowRoot?.activeElement as HTMLElement | null;
    this.focusedClear = from?.getAttribute('part') === 'clear' ? from : undefined;
    super.willUpdate(changed);
    if (changed.has('max')) {
      const count = Math.max(1, Math.min(10, Math.floor(this.max) || 5));
      this.options = Array.from({ length: count }, (_, index) => ({
        value: String(index + 1),
        label: `${index + 1} of ${count} stars`,
      }));
    }
  }
  protected updated(changed: PropertyValues) {
    const from = this.focusedClear;
    this.focusedClear = undefined;
    super.updated(changed);
    if (!from) return;
    const clear = this.renderRoot.querySelector<HTMLButtonElement>('[part=clear]:not(:disabled)');
    recoverFocus(
      from,
      clear ??
        (this.isDisabled
          ? this.renderRoot.querySelector<HTMLElement>('legend')
          : (this.control ?? this.renderRoot.querySelector<HTMLElement>('fieldset'))),
    );
  }
  disconnectedCallback() {
    this.focusedClear = undefined;
    super.disconnectedCallback();
  }
  /** Remove the selected rating and emit standard input/change events. Return focus to an available radio unless an application event handler moves it elsewhere. */
  clear() {
    if (this.isDisabled || !this.value) return;
    const from = activeElement(this.ownerDocument);
    this.value = '';
    this.renderRoot.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      input.checked = false;
    });
    this.invalid = false;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    if (!this.isDisabled)
      recoverFocus(from, this.control ?? this.renderRoot.querySelector<HTMLElement>('fieldset'));
  }
  render() {
    return html`<fieldset
        tabindex="-1"
        aria-describedby="help"
        aria-invalid=${this.hasVisibleError ? 'true' : 'false'}
        ?disabled=${this.isDisabled}
      >
        <legend tabindex="-1">
          ${this.label}${this.required ? html` <abbr title="required" aria-hidden="true">*</abbr>` : nothing}
        </legend>
        <div class="options">
          ${repeat(
            this.options,
            (option) => option.value,
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
