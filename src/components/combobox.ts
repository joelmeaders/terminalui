import { css, html, nothing, type PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { FormControl, fieldStyles } from '../internal/form-control';
import { observeFloating } from '../internal/floating';
import type { SelectOption } from './select';
import { fieldSlotStyles, optionalSlotStyles, syncSlot } from '../internal/slots';

/**
 * Searchable single select. Only enabled options can supply the submitted value.
 * @slot start - Leading icon, short prefix, or named action. Inert while disabled.
 * @slot end - Trailing icon, short suffix, or named action. Inert while disabled.
 * @csspart control - Frame around the native combobox and optional affixes.
 * @csspart input - input element.
 * @csspart listbox - listbox element.
 * @csspart option - option element.
 */
export class TCombobox extends FormControl {
  static properties = {
    options: { attribute: false },
    placeholder: {},
    loading: { type: Boolean },
    emptyMessage: { attribute: 'empty-message' },
    open: { state: true },
    query: { state: true },
    active: { state: true },
  };
  /** Available options. Replace this array when asynchronous results arrive. Values must be unique. */
  options: SelectOption[] = [];
  placeholder = '';
  /** Announce that the application is loading options. The component makes no network requests. */
  loading = false;
  emptyMessage = 'No options found.';
  private open = false;
  private query = '';
  private active = -1;
  private editing = false;
  private cleanupFloating?: () => void;
  static styles = [
    fieldStyles,
    optionalSlotStyles,
    fieldSlotStyles,
    css`
      .control {
        position: relative;
      }
      .list {
        position: fixed;
        inset: auto;
        overflow: auto;
        padding: 0;
        margin: 0;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        box-shadow: var(--_t-edge-glow);
        background: var(--t-bg);
        color: var(--t-text);
        font: inherit;
      }
      .scroll {
        max-height: calc(240px - var(--t-line-width, 1px) - var(--t-line-width, 1px));
        overflow: auto;
        padding: 4px;
      }
      [role='option'] {
        padding: 8px;
        cursor: pointer;
        font-size: 13px;
        border: var(--t-divider-width, 1px) solid transparent;
      }
      [role='option'][data-active] {
        background: var(--t-raised);
        border-color: var(--t-accent);
      }
      [role='option'][aria-disabled='true'] {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .status {
        padding: 8px;
        font-size: 12px;
        color: var(--t-muted);
      }
      @media (forced-colors: active) {
        .list {
          border-color: ButtonText;
        }
        [role='option'][data-active] {
          border-color: Highlight;
          background: Highlight;
          color: HighlightText;
        }
        [role='option'][aria-disabled='true'] {
          color: GrayText;
          opacity: 1;
        }
      }
    `,
  ];
  private get selected() {
    if (this.editing) return undefined;
    return this.options.find((option) => option.value === this.value && !option.disabled);
  }
  private get filtered() {
    const search = this.editing ? this.query.toLocaleLowerCase() : '';
    return this.options.filter((option) => option.label.toLocaleLowerCase().includes(search));
  }
  protected willUpdate(changed: PropertyValues) {
    if (changed.has('value') && this.value) this.editing = false;
    if (!this.editing && (changed.has('value') || changed.has('options')))
      this.query = this.selected?.label ?? '';
    if (changed.has('options') || changed.has('query')) this.active = -1;
    if (this.isDisabled) this.open = false;
  }
  connectedCallback() {
    super.connectedCallback();
    this.requestUpdate();
  }
  disconnectedCallback() {
    this.cleanupFloating?.();
    this.cleanupFloating = undefined;
    this.open = false;
    this.active = -1;
    super.disconnectedCallback();
  }
  protected updated(changed: PropertyValues) {
    super.updated(changed);
    if (!this.isConnected) return;
    const panel = this.renderRoot.querySelector<HTMLElement>('[popover]')!;
    if (this.open) {
      if (!this.cleanupFloating) {
        const anchor = this.renderRoot.querySelector<HTMLElement>('.field-row')!;
        const matchWidth = () => {
          panel.style.width = `${anchor.getBoundingClientRect().width}px`;
        };
        matchWidth();
        if (!panel.matches(':popover-open')) panel.showPopover();
        const resize = new ResizeObserver(matchWidth);
        resize.observe(anchor);
        const stopPosition = observeFloating(anchor, panel, 'bottom');
        this.cleanupFloating = () => {
          resize.disconnect();
          stopPosition();
        };
      }
    } else {
      this.cleanupFloating?.();
      this.cleanupFloating = undefined;
      if (panel.matches(':popover-open')) panel.hidePopover();
    }
  }
  protected syncForm() {
    super.syncForm();
    const selected = this.selected;
    this.internals.setFormValue(!this.isDisabled && selected ? selected.value : null);
    if (this.isDisabled || this.error || this.customValidationMessage) return;
    const unmatched = !selected && (!!this.query || !!this.value);
    const missing = this.required && (!selected || selected.value === '');
    this.internals.setValidity(
      unmatched ? { customError: true } : missing ? { valueMissing: true } : {},
      unmatched ? 'Choose an option from the list.' : missing ? 'Select an option.' : '',
      this.control ?? undefined,
    );
  }
  protected handleInput(event: Event) {
    event.stopPropagation();
    this.query = (event.target as HTMLInputElement).value;
    this.editing = true;
    this.value = '';
    this.active = -1;
    this.open = true;
    this.invalid = false;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }
  private choose(option: SelectOption) {
    if (option.disabled || this.isDisabled) return;
    this.value = option.value;
    this.query = option.label;
    this.editing = false;
    this.open = false;
    this.active = -1;
    this.invalid = false;
    if (this.control) this.control.value = this.query;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }
  private onKeydown(event: KeyboardEvent) {
    if (event.isComposing || this.isDisabled) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      this.active = -1;
      return;
    }
    if (
      ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) &&
      ((this.open && this.active >= 0) || event.key.startsWith('Arrow'))
    ) {
      event.preventDefault();
      this.open = true;
      const enabled = this.filtered
        .map((option, index) => (option.disabled ? -1 : index))
        .filter((index) => index >= 0);
      if (!enabled.length) {
        this.active = -1;
        return;
      }
      const position = enabled.indexOf(this.active);
      if (event.key === 'Home') this.active = enabled[0];
      else if (event.key === 'End') this.active = enabled[enabled.length - 1];
      else
        this.active =
          enabled[
            (position + (event.key === 'ArrowDown' ? 1 : position < 0 ? 0 : -1) + enabled.length) %
              enabled.length
          ];
      void this.updateComplete.then(() =>
        this.renderRoot.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' }),
      );
    } else if (event.key === 'Enter' && this.open) {
      event.preventDefault();
      const option = this.filtered[this.active];
      if (option) this.choose(option);
    } else if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      event.stopPropagation();
      this.open = false;
      this.active = -1;
    } else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      this.active = -1;
    }
  }
  private onBlur() {
    this.open = false;
    this.active = -1;
    const match = this.options.find((option) => !option.disabled && option.label === this.query);
    if (this.editing && match) this.choose(match);
  }
  formResetCallback() {
    this.value = this.getAttribute('value') ?? this.initialValue;
    this.editing = false;
    this.query = this.selected?.label ?? '';
    this.open = false;
    this.active = -1;
    this.invalid = false;
    if (this.control) this.control.value = this.query;
    this.syncForm();
  }
  render() {
    const options = this.filtered;
    return html`<div class="control">
        <label for="control"
          ><span class="label"
            >${this.label}${this.required ? html` <abbr title="required" aria-hidden="true">*</abbr>` : nothing}</span
          >
        </label>
        <div class="field-row" part="control">
          <slot name="start" data-optional @slotchange=${syncSlot} ?inert=${this.isDisabled}></slot>
          <input
            id="control"
            part="input"
            role="combobox"
            type="text"
            autocomplete="off"
            .value=${this.query}
            placeholder=${this.placeholder}
            ?disabled=${this.isDisabled}
            aria-required=${this.required ? 'true' : 'false'}
            aria-expanded=${this.open ? 'true' : 'false'}
            aria-controls="options"
            aria-autocomplete="list"
            aria-activedescendant=${ifDefined(this.open && this.active >= 0 ? `option-${this.active}` : undefined)}
            aria-describedby="help"
            aria-invalid=${this.hasVisibleError ? 'true' : 'false'}
            @input=${this.handleInput}
            @change=${(event: Event) => event.stopPropagation()}
            @focus=${() => {
              if (!this.isDisabled) this.open = true;
            }}
            @click=${() => {
              if (!this.isDisabled) {
                this.open = true;
                this.active = -1;
              }
            }}
            @blur=${this.onBlur}
            @keydown=${this.onKeydown}
          />
          <slot name="end" data-optional @slotchange=${syncSlot} ?inert=${this.isDisabled}></slot>
        </div>
        <div
          class="list"
          part="listbox"
          popover="manual"
          @toggle=${(event: Event) => {
            if (!(event.currentTarget as HTMLElement).matches(':popover-open')) this.open = false;
          }}
          @mousedown=${(event: MouseEvent) => event.preventDefault()}
        >
          <div class="scroll">
            <div
              id="options"
              role="listbox"
              aria-label=${this.label}
              aria-busy=${this.loading ? 'true' : 'false'}
            >
              ${options.map(
                (option, index) =>
                  html`<div
                    id=${`option-${index}`}
                    part="option"
                    role="option"
                    aria-selected=${option.value === this.value ? 'true' : 'false'}
                    aria-disabled=${option.disabled ? 'true' : 'false'}
                    ?data-active=${index === this.active}
                    @click=${() => this.choose(option)}
                  >
                    ${option.label}
                  </div>`,
              )}
            </div>
            ${this.loading || !options.length ? html`<div class="status" role="status">${this.loading ? 'Loading options…' : this.emptyMessage}</div>` : nothing}
          </div>
        </div>
      </div>
      ${this.renderDescription()}`;
  }
}
if (!customElements.get('t-combobox')) customElements.define('t-combobox', TCombobox);
declare global {
  interface HTMLElementTagNameMap {
    't-combobox': TCombobox;
  }
}
