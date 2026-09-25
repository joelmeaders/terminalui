import { css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { FormControl, fieldStyles } from '../internal/form-control';
import { activeElement } from '../internal/floating';
import type { SelectOption } from './select';

/**
 * Choose several options with native checkboxes. Each choice submits a FormData entry under name.
 * The values property is a string array; value is its JSON string form for attribute and state restoration.
 * Replacing options preserves focus by choice value. An empty required list focuses its named group on validation.
 *
 * @fires input - A user changed the values array.
 * @fires change - A user committed a checkbox change.
 * @csspart list - Scrollable choice list.
 * @csspart option - One labeled choice.
 * @csspart checkbox - Native choice checkbox.
 * @csspart filter - Optional search field.
 */
export class TMultiSelect extends FormControl {
  static properties = {
    options: { attribute: false },
    values: { attribute: false },
    searchable: { type: Boolean },
    emptyMessage: { attribute: 'empty-message' },
    query: { state: true },
  };

  /** Available choices. Values must be unique. Replace the array to update the list. Focus follows a surviving value. */
  options: SelectOption[] = [];
  /** Selected option values. Replace the array to change selection. */
  values: string[] = [];
  /** Show a text field that filters choices by label without changing selection. */
  searchable = false;
  /** Message shown when no choice matches the filter or the options array is empty. */
  emptyMessage = 'No options found.';
  private query = '';
  private serialized = '';
  private entryError = '';
  private focusedChoice?: { element: HTMLInputElement; value: string; index: number };
  private groupHadFocus = false;

  static styles = [
    fieldStyles,
    css`
      fieldset {
        min-width: 0;
        margin: 0;
        padding: 0;
        border: 0;
      }
      fieldset:focus {
        outline: 2px solid var(--t-focus);
        outline-offset: 4px;
      }
      legend {
        padding: 0;
        margin-bottom: 8px;
        color: var(--t-text);
        font-size: 12px;
      }
      .filter-label {
        display: block;
        margin-bottom: 8px;
      }
      .filter-label span {
        display: block;
        margin-bottom: 4px;
      }
      .list {
        max-height: 256px;
        overflow: auto;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        background: var(--t-bg);
        scroll-padding-block: 8px;
      }
      .option {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: var(--t-control-height, 42px);
        padding: 6px 10px;
        color: var(--t-text);
        cursor: pointer;
      }
      .option + .option {
        border-top: var(--t-divider-width, 1px) solid var(--t-border);
      }
      .option:has(input:checked) {
        background: var(--t-raised);
      }
      .option:has(input:focus-visible) {
        outline: 2px solid var(--t-focus);
        outline-offset: -2px;
      }
      .option:has(input:disabled) {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .option input {
        appearance: auto;
        flex: none;
        width: 20px;
        min-height: 20px;
        height: 20px;
        padding: 0;
        margin: 0;
        border: initial;
        background: initial;
        box-shadow: none;
        accent-color: var(--t-accent);
      }
      .option input:focus {
        outline: 0;
      }
      .option span {
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .empty {
        padding: 12px;
        margin: 0;
        color: var(--t-muted);
      }
      @media (forced-colors: active) {
        fieldset:focus {
          outline-color: Highlight;
        }
        .list {
          border-color: ButtonText;
        }
        .option:has(input:checked) {
          background: Highlight;
          color: HighlightText;
        }
        .option:has(input:disabled) {
          color: GrayText;
          opacity: 1;
        }
      }
    `,
  ];

  private normalizeValues(values: string[]) {
    return [...new Set(values.filter((value) => typeof value === 'string'))];
  }

  protected willUpdate(changed: PropertyValues) {
    if (changed.has('options')) {
      const active = this.shadowRoot?.activeElement;
      const choice =
        active instanceof HTMLInputElement && active.type === 'checkbox' ? active : undefined;
      const enabled = [
        ...this.renderRoot.querySelectorAll<HTMLInputElement>(
          'input[type=checkbox]:not(:disabled)',
        ),
      ];
      this.focusedChoice = choice
        ? { element: choice, value: choice.value, index: enabled.indexOf(choice) }
        : undefined;
      this.groupHadFocus = active === this.renderRoot.querySelector('fieldset');
    }
    if (changed.has('value') && this.value !== this.serialized) {
      try {
        const parsed: unknown = this.value ? JSON.parse(this.value) : [];
        if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'string'))
          throw new Error('Invalid multi-select value');
        this.values = this.normalizeValues(parsed);
        this.entryError = '';
      } catch {
        this.values = [];
        this.entryError = 'The value must be a JSON array of strings.';
        this.invalid = true;
        return;
      }
    } else if (changed.has('values')) {
      this.values = this.normalizeValues(this.values);
      this.entryError = '';
    }
    this.value = this.serialized = JSON.stringify(this.values);
  }

  protected updated(changed: PropertyValues) {
    super.updated(changed);
    if (!changed.has('options')) return;
    const focused = this.focusedChoice;
    const groupHadFocus = this.groupHadFocus;
    this.focusedChoice = undefined;
    this.groupHadFocus = false;
    if ((!focused && !groupHadFocus) || this.isDisabled) return;
    const group = this.renderRoot.querySelector<HTMLElement>('fieldset');
    const current = activeElement();
    if (
      current &&
      current !== focused?.element &&
      current !== group &&
      current !== this &&
      current !== document.body
    )
      return;
    const enabled = [
      ...this.renderRoot.querySelectorAll<HTMLInputElement>('input[type=checkbox]:not(:disabled)'),
    ];
    const match = enabled.find((choice) => choice.value === focused?.value);
    const fallback = enabled[Math.min(focused?.index ?? 0, enabled.length - 1)];
    (
      match ??
      fallback ??
      this.renderRoot.querySelector<HTMLElement>('input[type=search]') ??
      group
    )?.focus();
  }

  protected syncForm() {
    const choices = new Set(
      this.options.filter((option) => !option.disabled).map((option) => option.value),
    );
    const selected = this.values.filter((value) => choices.has(value));
    const data = new FormData();
    if (this.name) selected.forEach((value) => data.append(this.name, value));
    this.internals.setFormValue(this.isDisabled ? null : data, JSON.stringify(this.values));
    const message = this.isDisabled
      ? ''
      : this.error ||
        this.customValidationMessage ||
        this.entryError ||
        (this.required && !selected.length ? 'Choose at least one option.' : '');
    const anchor =
      this.renderRoot.querySelector<HTMLInputElement>('input[type="checkbox"]:not(:disabled)') ??
      this.control ??
      this.renderRoot.querySelector<HTMLElement>('fieldset');
    this.internals.setValidity(
      message
        ? this.required &&
          !selected.length &&
          !this.error &&
          !this.customValidationMessage &&
          !this.entryError
          ? { valueMissing: true }
          : { customError: true }
        : {},
      message,
      anchor ?? undefined,
    );
  }

  private onChoiceInput(event: Event) {
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    const selected = new Set(this.values);
    if (input.checked) selected.add(input.value);
    else selected.delete(input.value);
    this.values = [...selected];
    this.value = this.serialized = JSON.stringify(this.values);
    this.entryError = '';
    this.invalid = false;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  private onChoiceChange(event: Event) {
    event.stopPropagation();
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  formResetCallback() {
    this.value = this.getAttribute('value') ?? this.initialValue;
    try {
      this.values = this.normalizeValues(JSON.parse(this.value || '[]'));
    } catch {
      this.values = [];
    }
    this.value = this.serialized = JSON.stringify(this.values);
    this.query = '';
    this.entryError = '';
    this.invalid = false;
    this.syncForm();
  }

  focus(options?: FocusOptions) {
    const selector = this.searchable
      ? 'input[type="search"]'
      : 'input[type="checkbox"]:not(:disabled)';
    (
      this.renderRoot.querySelector<HTMLInputElement>(selector) ??
      this.renderRoot.querySelector<HTMLElement>('fieldset')
    )?.focus(options);
  }

  render() {
    const query = this.query.toLocaleLowerCase();
    const options = this.options.filter((option) =>
      option.label.toLocaleLowerCase().includes(query),
    );
    return html`<fieldset tabindex="-1" aria-describedby="help" ?disabled=${this.isDisabled}>
        <legend>
          ${this.label}${this.required ? html` <abbr title="required" aria-hidden="true">*</abbr><span class="visually-hidden"> required</span>` : nothing}
        </legend>
        ${
          this.searchable
            ? html`<label class="filter-label" for="filter"
                ><span>Filter ${this.label || 'options'}</span
                ><input
                  id="filter"
                  part="filter"
                  type="search"
                  .value=${this.query}
                  ?disabled=${this.isDisabled}
                  @input=${(event: Event) => {
                    event.stopPropagation();
                    this.query = (event.target as HTMLInputElement).value;
                  }}
                  @change=${(event: Event) => event.stopPropagation()}
              /></label>`
            : nothing
        }
        <div class="list" part="list">
          ${
            options.length
              ? repeat(
                  options,
                  (option) => option.value,
                  (option) =>
                    html`<label class="option" part="option"
                      ><input
                        part="checkbox"
                        type="checkbox"
                        .value=${option.value}
                        .checked=${this.values.includes(option.value)}
                        ?disabled=${this.isDisabled || option.disabled}
                        aria-describedby="help"
                        aria-invalid=${this.hasVisibleError ? 'true' : 'false'}
                        @input=${this.onChoiceInput}
                        @change=${this.onChoiceChange}
                      /><span>${option.label}</span></label
                    >`,
                )
              : html`<p class="empty">${this.emptyMessage}</p>`
          }
        </div>
      </fieldset>
      ${this.renderDescription()}`;
  }
}
if (!customElements.get('t-multi-select')) customElements.define('t-multi-select', TMultiSelect);
declare global {
  interface HTMLElementTagNameMap {
    't-multi-select': TMultiSelect;
  }
}
