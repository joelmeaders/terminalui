import { css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { FormControl, fieldStyles } from '../internal/form-control';
import { activeElement, recoverFocus } from '../internal/floating';

/**
 * Editable unique text tags. Each tag submits a separate FormData entry under name.
 * The value property is a JSON array string. The values property is the corresponding string array.
 * Enter or comma adds a tag. Backspace in an empty entry removes the last tag.
 * Live tag changes retain removal-action identity or recover focus to the entry field.
 * Disabled actions recover to the named selected-tag list. Outside focus remains unchanged.
 *
 * @csspart input - Tag entry field.
 *
 * @csspart tag - One selected tag.
 *
 * @csspart remove - Named tag removal action.
 */
export class TTagsInput extends FormControl {
  static properties = {
    values: { attribute: false },
    placeholder: {},
    maxTags: { type: Number, attribute: 'max-tags' },
    draft: { state: true },
    statusMessage: { state: true },
  };
  label = 'Tags';
  help =
    'Press Enter or comma to add a tag. Backspace removes the last tag when the entry is empty.';
  /** Selected tags. Replace this array to change the selection. Empty and duplicate strings are removed. */
  values: string[] = [];
  /** Optional maximum number of tags. Zero means no maximum. */
  maxTags = 0;
  placeholder = 'Add a tag';
  private draft = '';
  private serialized = '';
  private entryError = '';
  private statusMessage = '';
  private focusedRemoval?: { from: HTMLElement; tag: string };
  get validationMessage() {
    return this.error || this.customValidationMessage || this.entryError || super.validationMessage;
  }
  static styles = [
    fieldStyles,
    css`
      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 0;
        margin: 0 0 8px;
        list-style: none;
      }
      .tag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        max-width: 100%;
        padding-left: 8px;
        color: var(--t-text);
        background: var(--t-raised);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
      }
      .tag span {
        min-width: 0;
        overflow-wrap: anywhere;
      }
      button {
        flex: none;
        min-width: 32px;
        min-height: 32px;
        padding: 4px 8px;
        color: var(--t-text);
        background: transparent;
        border: 0;
      }
      @media (forced-colors: active) {
        .tag {
          border-color: ButtonText;
        }
      }
    `,
  ];
  private normalizeTags(values: string[]) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }
  protected willUpdate(changed: PropertyValues) {
    const from = this.shadowRoot?.activeElement as HTMLElement | null;
    this.focusedRemoval =
      from?.getAttribute('part') === 'remove' ? { from, tag: from.dataset.tag! } : undefined;
    if (changed.has('value') && this.value !== this.serialized) {
      try {
        const parsed: unknown = this.value ? JSON.parse(this.value) : [];
        if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'string'))
          throw new Error('Invalid tags');
        this.values = this.normalizeTags(parsed);
        this.entryError = '';
      } catch {
        this.values = [];
        this.entryError = 'The tag value must be a JSON array of strings.';
        this.invalid = true;
        return;
      }
    } else if (changed.has('values')) {
      this.values = this.normalizeTags(this.values);
      this.entryError = '';
    }
    this.value = this.serialized = JSON.stringify(this.values);
  }
  protected updated(changed: PropertyValues) {
    const focused = this.focusedRemoval;
    this.focusedRemoval = undefined;
    super.updated(changed);
    if (!focused) return;
    const action = [...this.renderRoot.querySelectorAll<HTMLButtonElement>('[part=remove]')].find(
      (button) => button.dataset.tag === focused.tag && !button.disabled,
    );
    recoverFocus(
      focused.from,
      action ??
        (this.isDisabled ? this.renderRoot.querySelector<HTMLElement>('.tags') : this.control),
    );
  }
  disconnectedCallback() {
    this.focusedRemoval = undefined;
    super.disconnectedCallback();
  }
  protected syncForm() {
    super.syncForm();
    const data = new FormData();
    if (this.name) this.values.forEach((value) => data.append(this.name, value));
    this.internals.setFormValue(this.isDisabled ? null : data, JSON.stringify(this.values));
    if (this.isDisabled || this.error || this.customValidationMessage) return;
    const missing = this.required && !this.values.length;
    const tooMany = this.maxTags > 0 && this.values.length > this.maxTags;
    const message =
      this.entryError ||
      (tooMany ? `Use no more than ${this.maxTags} tags.` : missing ? 'Add at least one tag.' : '');
    this.internals.setValidity(
      message ? (missing && !this.entryError ? { valueMissing: true } : { customError: true }) : {},
      message,
      this.control ?? undefined,
    );
  }
  private changeValues(values: string[]) {
    this.values = values;
    this.value = this.serialized = JSON.stringify(values);
    this.entryError = '';
    this.invalid = false;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }
  /** Add a nonempty unique tag. Returns false if the value is a duplicate or exceeds maxTags. */
  addTag(value: string): boolean {
    if (this.isDisabled) return false;
    const tag = value.trim();
    if (!tag) return false;
    this.entryError = this.values.includes(tag)
      ? `${tag} is already selected.`
      : this.maxTags > 0 && this.values.length >= this.maxTags
        ? `Use no more than ${this.maxTags} tags.`
        : '';
    if (this.entryError) {
      this.invalid = true;
      this.syncForm();
      this.requestUpdate();
      return false;
    }
    this.draft = '';
    if (this.control) this.control.value = '';
    this.changeValues([...this.values, tag]);
    this.statusMessage = `Added ${tag}. ${this.values.length} ${this.values.length === 1 ? 'tag' : 'tags'} selected.`;
    return true;
  }
  /** Remove a selected tag. Focus returns to the entry field unless an application event handler moves it elsewhere. */
  removeTag(value: string) {
    if (this.isDisabled || !this.values.includes(value)) return;
    const from = activeElement(this.ownerDocument);
    this.changeValues(this.values.filter((tag) => tag !== value));
    this.statusMessage = `Removed ${value}. ${this.values.length} ${this.values.length === 1 ? 'tag' : 'tags'} selected.`;
    recoverFocus(from, this.control);
  }
  protected handleInput(event: Event) {
    event.stopPropagation();
    this.draft = (event.target as HTMLInputElement).value;
    this.entryError = '';
    this.invalid = false;
    this.statusMessage = '';
    this.syncForm();
  }
  private onKeydown(event: KeyboardEvent) {
    if (event.isComposing || this.isDisabled) return;
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag(this.draft);
    } else if (event.key === 'Backspace' && !this.draft && this.values.length) {
      event.preventDefault();
      this.removeTag(this.values[this.values.length - 1]);
    }
  }
  formResetCallback() {
    this.value = this.getAttribute('value') ?? this.initialValue;
    try {
      this.values = this.normalizeTags(JSON.parse(this.value || '[]'));
    } catch {
      this.values = [];
    }
    this.serialized = this.value = JSON.stringify(this.values);
    this.draft = '';
    this.statusMessage = '';
    this.entryError = '';
    this.invalid = false;
    if (this.control) this.control.value = '';
    this.syncForm();
  }
  render() {
    return html`<label for="entry" class="label"
        >${this.label}${this.required ? html` <abbr title="required" aria-hidden="true">*</abbr>` : nothing}</label
      >
      <ul class="tags" tabindex="-1" aria-label=${`${this.label || 'Tags'} selected`}>
        ${repeat(
          this.values,
          (tag) => tag,
          (tag) =>
            html`<li class="tag" part="tag">
              <span>${tag}</span
              ><button
                type="button"
                part="remove"
                data-tag=${tag}
                aria-label=${`Remove ${tag}`}
                ?disabled=${this.isDisabled}
                @click=${() => this.removeTag(tag)}
              >
                ×
              </button>
            </li>`,
        )}
      </ul>
      <input
        id="entry"
        part="input"
        type="text"
        .value=${this.draft}
        placeholder=${this.placeholder}
        ?disabled=${this.isDisabled}
        aria-required=${this.required ? 'true' : 'false'}
        aria-describedby="help"
        aria-invalid=${this.hasVisibleError ? 'true' : 'false'}
        @input=${this.handleInput}
        @change=${(event: Event) => event.stopPropagation()}
        @keydown=${this.onKeydown}
        @blur=${() => {
          if (this.draft.trim()) this.addTag(this.draft);
        }}
      />${this.renderDescription()}
      <span class="visually-hidden" role="status">${this.statusMessage}</span>`;
  }
}
if (!customElements.get('t-tags-input')) customElements.define('t-tags-input', TTagsInput);
declare global {
  interface HTMLElementTagNameMap {
    't-tags-input': TTagsInput;
  }
}
