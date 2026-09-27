import { css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { baseStyles, TerminalElement } from '../internal/base';
import { observeFloating, recoverFocus } from '../internal/floating';
import { inlineSlotStyles } from '../internal/slots';

export interface MenuOption {
  value: string;
  label: string;
  disabled?: boolean;
  separator?: boolean;
}

/**
 * Single-level action menu with arrow navigation, typeahead, and focus return.
 * With no actions, the popup is a named group with an empty-state status notice.
 * Long labels wrap. Focused actions scroll into view. With no enabled actions, the popup supports native keyboard scrolling.
 * @slot start - Non-interactive icon before the trigger label.
 * @slot end - Non-interactive icon or content after the trigger label, before the arrow.
 *
 * @fires {CustomEvent<{ value: string; option: MenuOption }>} t-select - Selected action: `{ value, option }`.
 *
 * @csspart trigger - Native trigger button.
 *
 * @csspart menu - Popup surface for actions or an empty-state notice.
 *
 * @csspart item - Action button.
 */
export class TMenu extends TerminalElement {
  static properties = {
    label: {},
    options: { attribute: false },
    disabled: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
    emptyMessage: { attribute: 'empty-message' },
  };
  /** Accessible trigger text. */
  label = 'Actions';
  /** Actions with unique values. Replace the array to update the menu. Focus follows a surviving value. A separator entry displays a divider. */
  options: MenuOption[] = [];
  /** Prevents opening the menu. */
  disabled = false;
  /** Whether the menu is visible. */
  open = false;
  /** Status notice when the options contain no actions. Separators are not actions. */
  emptyMessage = 'No actions available.';
  private search = '';
  private searchTime = 0;
  private cleanup?: () => void;
  private listeningDocument?: Document;
  private focusedOption?: { value: string; index: number };
  private focusBeforeUpdate?: HTMLElement;
  private menuHadFocus = false;
  static styles = [
    baseStyles,
    inlineSlotStyles,
    css`
      :host {
        display: inline-block;
        min-width: 0;
        max-width: 100%;
        position: relative;
      }
      button {
        color: var(--t-text);
        background: var(--t-surface);
        padding: var(--t-space-2, 8px) var(--t-space-3, 12px);
        max-width: 100%;
        overflow-wrap: anywhere;
      }
      .trigger {
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        box-shadow: var(--_t-edge-glow);
      }
      [part='menu'] {
        position: fixed;
        inset: auto;
        margin: 0;
        min-width: min(180px, calc(100vw - 16px));
        width: max-content;
        overflow: auto;
        background: var(--t-surface);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        padding: 4px;
        box-shadow:
          var(--_t-edge-glow),
          0 8px 24px #0005;
      }
      [role='menuitem'] {
        display: block;
        width: 100%;
        border: 0;
        text-align: start;
        white-space: normal;
      }
      [role='menuitem']:focus,
      [role='menuitem']:hover {
        background: var(--t-raised);
        color: var(--t-accent);
        outline-offset: -2px;
      }
      [role='separator'] {
        border-top: var(--t-divider-width, 1px) solid var(--t-control-border, var(--t-border));
        margin: 4px;
      }
      .empty {
        margin: 0;
        padding: 8px 12px;
        color: var(--t-muted);
        overflow-wrap: anywhere;
      }
    `,
  ];
  private outside = (event: Event) => {
    if (this.open && !event.composedPath().includes(this)) this.dismiss(false);
  };
  connectedCallback() {
    super.connectedCallback();
    this.requestUpdate();
    this.listeningDocument = this.ownerDocument;
    this.listeningDocument.addEventListener('pointerdown', this.outside);
    this.listeningDocument.addEventListener('focusin', this.outside);
  }
  disconnectedCallback() {
    this.open = false;
    super.disconnectedCallback();
    this.cleanup?.();
    this.cleanup = undefined;
    this.listeningDocument?.removeEventListener('pointerdown', this.outside);
    this.listeningDocument?.removeEventListener('focusin', this.outside);
    this.listeningDocument = undefined;
    this.focusBeforeUpdate = undefined;
  }
  protected willUpdate(changed: PropertyValues) {
    if (!changed.has('options') || !this.open) return;
    const active = this.shadowRoot?.activeElement;
    const panel = this.renderRoot.querySelector<HTMLElement>('#menu');
    this.menuHadFocus = active === panel || active?.getAttribute('role') === 'menuitem';
    this.focusBeforeUpdate = this.menuHadFocus ? (active as HTMLElement) : undefined;
    const item = active?.getAttribute('role') === 'menuitem' ? (active as HTMLButtonElement) : null;
    this.focusedOption = item
      ? { value: item.dataset.value ?? '', index: this.buttons().indexOf(item) }
      : undefined;
  }
  protected updated(changed: PropertyValues) {
    if (!this.isConnected) return;
    if (this.disabled && this.open) {
      this.open = false;
      return;
    }
    const panel = this.renderRoot.querySelector<HTMLElement>('#menu')!;
    if (this.open && !panel.matches(':popover-open')) panel.showPopover();
    if (!this.open && panel.matches(':popover-open')) panel.hidePopover();
    if (this.open && !this.cleanup)
      this.cleanup = observeFloating(
        this.renderRoot.querySelector<HTMLButtonElement>('.trigger')!,
        panel,
      );
    if (!this.open) {
      this.cleanup?.();
      this.cleanup = undefined;
      this.menuHadFocus = false;
      this.focusedOption = undefined;
      this.syncTabStops();
    }
    if (changed.has('open') && this.open) this.focusAction(this.buttons()[0] ?? panel);
    else if (changed.has('options') && this.open && this.menuHadFocus) {
      const buttons = this.buttons();
      const match = buttons.find((button) => button.dataset.value === this.focusedOption?.value);
      const target =
        match ?? buttons[Math.min(this.focusedOption?.index ?? 0, buttons.length - 1)] ?? panel;
      this.syncTabStops(target);
      if (this.ownerDocument.hasFocus()) recoverFocus(this.focusBeforeUpdate, target);
    }
    this.menuHadFocus = false;
    this.focusedOption = undefined;
    this.focusBeforeUpdate = undefined;
  }
  private buttons() {
    return [
      ...this.renderRoot.querySelectorAll<HTMLButtonElement>('[role=menuitem]:not(:disabled)'),
    ];
  }
  private syncTabStops(current?: HTMLElement) {
    for (const button of this.renderRoot.querySelectorAll<HTMLButtonElement>('[role=menuitem]'))
      button.tabIndex = button === current && !button.disabled ? 0 : -1;
    const panel = this.renderRoot.querySelector<HTMLElement>('#menu')!;
    panel.tabIndex = panel === current ? 0 : -1;
  }
  private focusAction(current: HTMLElement) {
    this.syncTabStops(current);
    current.focus({ preventScroll: true });
    current.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }
  private dismiss(restore = true) {
    this.open = false;
    this.search = '';
    this.syncTabStops();
    if (restore) this.renderRoot.querySelector<HTMLButtonElement>('.trigger')?.focus();
  }
  private async show(last = false) {
    if (this.disabled) return;
    this.open = true;
    await this.updateComplete;
    const buttons = this.buttons();
    const target =
      buttons[last ? buttons.length - 1 : 0] ?? this.renderRoot.querySelector<HTMLElement>('#menu');
    if (target) this.focusAction(target);
  }
  private choose(option: MenuOption) {
    if (option.disabled || option.separator) return;
    this.dismiss();
    this.emit('t-select', { value: option.value, option });
  }
  private onKey(event: KeyboardEvent) {
    const buttons = this.buttons();
    const index = buttons.indexOf(
      this.renderRoot.querySelector('[role=menuitem]:focus') as HTMLButtonElement,
    );
    let next = index;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.dismiss();
      return;
    }
    if (event.key === 'Tab') {
      this.dismiss();
      return;
    }
    if (!buttons.length) return;
    if (event.key === 'ArrowDown') next = (index + 1) % buttons.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else if (
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const now = Date.now();
      this.search = now - this.searchTime > 700 ? event.key : this.search + event.key;
      this.searchTime = now;
      const search = [...this.search].every((c) => c === this.search[0])
        ? this.search[0]
        : this.search;
      next = buttons.findIndex((_, offset) =>
        buttons[(index + 1 + offset) % buttons.length]
          .textContent!.trim()
          .toLocaleLowerCase()
          .startsWith(search.toLocaleLowerCase()),
      );
      if (next >= 0) next = (index + 1 + next) % buttons.length;
    } else return;
    event.preventDefault();
    if (buttons[next]) this.focusAction(buttons[next]);
  }
  render() {
    const hasActions = this.options.some((option) => !option.separator);
    return html` <button
        class="trigger"
        part="trigger"
        type="button"
        ?disabled=${this.disabled}
        aria-haspopup=${hasActions ? 'menu' : nothing}
        aria-expanded=${this.open}
        @click=${() => (this.open ? this.dismiss() : this.show())}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            void this.show(event.key === 'ArrowUp');
          }
        }}
      >
        <slot name="start"></slot>${this.label}<slot name="end"></slot>
        <span aria-hidden="true">▾</span>
      </button>
      <div
        id="menu"
        part="menu"
        role=${hasActions ? 'menu' : 'group'}
        tabindex="-1"
        popover="manual"
        aria-label=${this.label}
        @keydown=${this.onKey}
      >
        ${repeat(
          this.options,
          (option) => option.value,
          (option) =>
            option.separator
              ? html`<div role="separator"></div>`
              : html`<button
                  part="item"
                  type="button"
                  role="menuitem"
                  data-value=${option.value}
                  tabindex="-1"
                  ?disabled=${option.disabled}
                  @focus=${(event: FocusEvent) => this.syncTabStops(event.currentTarget as HTMLElement)}
                  @click=${() => this.choose(option)}
                >
                  ${option.label}
                </button>`,
        )}
        ${hasActions ? nothing : html`<p class="empty" role="status">${this.emptyMessage}</p>`}
      </div>`;
  }
}
if (!customElements.get('t-menu')) customElements.define('t-menu', TMenu);
declare global {
  interface HTMLElementTagNameMap {
    't-menu': TMenu;
  }
}
