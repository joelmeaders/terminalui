import { css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { baseStyles, TerminalElement } from '../internal/base';
import { activeElement } from '../internal/floating';
import { containModalTab } from '../internal/modal-focus';
import { ModalScrollController } from '../internal/modal-scroll';

export interface CommandItem {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
  disabled?: boolean;
}
/**
 * Searchable modal command list. No global shortcut is registered.
 * Empty results remain a status notice without an expanded listbox. Loading lists are busy.
 *
 * @fires {CustomEvent<{ value: string; command: CommandItem }>} t-select - Command chosen: `{ value, command }`.
 *
 * @fires {CustomEvent<null>} t-close - Modal closed and focus returned.
 *
 * @csspart dialog - Native modal.
 *
 * @csspart search - Search input.
 *
 * @csspart option - Command option.
 */
export class TCommandPalette extends TerminalElement {
  static properties = {
    commands: { attribute: false },
    open: { type: Boolean, reflect: true },
    heading: {},
    query: {},
    placeholder: {},
    loading: { type: Boolean },
    activeValue: { state: true },
  };
  /** Commands with unique values. Replace the array to update commands. */
  commands: CommandItem[] = [];
  /** Whether the native modal is open. */
  open = false;
  /** Modal accessible name and visible title. */
  heading = 'Command palette';
  /** Search text. show() resets the query. */
  query = '';
  /** Search input placeholder. */
  placeholder = 'Search commands';
  /** Shows a loading status and prevents command selection. */
  loading = false;
  private activeValue = '';
  private opener?: HTMLElement;
  private scrollLock = new ModalScrollController(this);
  static styles = [
    baseStyles,
    css`
      dialog {
        overscroll-behavior: contain;
        width: min(600px, calc(100vw - 32px));
        max-height: calc(100dvh - 32px);
        padding: 0;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        color: var(--t-text);
        background: var(--t-surface);
        box-shadow:
          var(--_t-edge-glow),
          0 24px 80px #0008;
      }
      dialog[open] {
        display: flex;
        flex-direction: column;
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 0.72);
      }
      header {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 12px;
        padding: 16px;
        flex: none;
      }
      h2 {
        font: inherit;
        font-weight: bold;
        margin: 0;
        overflow-wrap: anywhere;
      }
      .close {
        flex: none;
        min-width: 32px;
        min-height: 32px;
        border: 0;
        color: var(--t-text);
        background: transparent;
      }
      .search {
        padding: 0 16px 12px;
        flex: none;
      }
      input {
        width: 100%;
        min-width: 0;
        min-height: var(--t-control-height, 42px);
        padding: 10px 12px;
        color: var(--t-text);
        background: var(--t-bg);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
      }
      .results {
        overscroll-behavior: contain;
        overflow: auto;
        min-height: 0;
        padding: 4px 8px 8px;
      }
      [role='option'] {
        padding: 12px;
        cursor: pointer;
        overflow-wrap: anywhere;
      }
      [aria-selected='true'] {
        color: var(--t-accent);
        background: var(--t-raised);
        outline: 2px solid var(--t-focus);
        outline-offset: -2px;
      }
      [aria-disabled='true'] {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .description {
        display: block;
        color: var(--t-muted);
      }
      .status {
        padding: 8px 16px;
        margin: 0;
        color: var(--t-muted);
        flex: none;
      }
    `,
  ];
  private filtered() {
    if (this.loading) return [];
    const query = this.query.trim().toLocaleLowerCase();
    return this.commands.filter((command) =>
      `${command.label} ${command.description ?? ''} ${(command.keywords ?? []).join(' ')}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }
  protected willUpdate(_changed: PropertyValues) {
    const commands = this.filtered();
    if (!commands.some((command) => command.value === this.activeValue && !command.disabled))
      this.activeValue = commands.find((command) => !command.disabled)?.value ?? '';
  }
  /** Opens the modal, clears search, and remembers its focus return target. */
  show(opener?: HTMLElement) {
    if (!this.open) this.opener = opener ?? activeElement(this.ownerDocument);
    this.query = '';
    this.open = true;
  }
  /** Closes the modal. */
  close() {
    this.open = false;
  }
  protected updated(_changed: PropertyValues) {
    if (!this.isConnected) return;
    const dialog = this.renderRoot.querySelector('dialog')!;
    if (this.open && !dialog.open) {
      this.opener ??= activeElement(this.ownerDocument);
      this.scrollLock.acquire();
      dialog.showModal();
      this.renderRoot.querySelector('input')?.focus();
    } else if (!this.open) {
      if (dialog.open) dialog.close();
      this.scrollLock.release();
    }
  }
  private onClose() {
    if (this.renderRoot.querySelector('dialog')?.open) return;
    this.scrollLock.release();
    this.open = false;
    if (this.opener?.isConnected) this.opener.focus({ preventScroll: true });
    this.opener = undefined;
    this.emit('t-close');
  }
  private choose(command: CommandItem) {
    if (command.disabled || this.loading) return;
    this.emit('t-select', { value: command.value, command });
    this.close();
  }
  private async move(value: string) {
    this.activeValue = value;
    await this.updateComplete;
    this.renderRoot.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' });
  }
  private onSearchKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    const commands = this.filtered().filter((command) => !command.disabled),
      index = commands.findIndex((command) => command.value === this.activeValue);
    let next = index;
    if (event.key === 'ArrowDown') next = (index + 1) % commands.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + commands.length) % commands.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = commands.length - 1;
    else if (event.key === 'Enter') {
      event.preventDefault();
      if (commands[index]) this.choose(commands[index]);
      return;
    } else return;
    event.preventDefault();
    if (commands[next]) void this.move(commands[next].value);
  }
  render() {
    const commands = this.filtered(),
      hasList = commands.length > 0 || this.loading,
      activeIndex = commands.findIndex((command) => command.value === this.activeValue);
    return html`<dialog
      part="dialog"
      aria-labelledby="title"
      @close=${this.onClose}
      @cancel=${() => {
        this.open = false;
      }}
      @keydown=${(event: KeyboardEvent) => containModalTab(event, event.currentTarget as HTMLDialogElement)}
    >
      <header>
        <h2 id="title">${this.heading}</h2>
        <button class="close" type="button" aria-label="Close command palette" @click=${this.close}>
          ×
        </button>
      </header>
      <div class="search">
        <label class="visually-hidden" for="query">Search commands</label
        ><input
          part="search"
          id="query"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded=${this.open && hasList}
          aria-controls=${hasList ? 'commands' : nothing}
          aria-activedescendant=${activeIndex >= 0 ? `command-${activeIndex}` : nothing}
          aria-describedby="instructions"
          placeholder=${this.placeholder}
          .value=${this.query}
          @input=${(event: Event) => {
            this.query = (event.target as HTMLInputElement).value;
            this.activeValue = '';
          }}
          @keydown=${this.onSearchKey}
        /><span class="visually-hidden" id="instructions"
          >Use arrow keys to choose a command. Press Enter to run it. Press Escape to close.</span
        >
      </div>
      <div
        class="results"
        role=${hasList ? 'listbox' : 'group'}
        id="commands"
        aria-label="Commands"
        aria-busy=${this.loading}
      >
        ${repeat(
          commands,
          (command) => command.value,
          (command, index) =>
            html`<div
              id=${`command-${index}`}
              role="option"
              part="option"
              aria-selected=${command.value === this.activeValue}
              aria-disabled=${Boolean(command.disabled)}
              @mousedown=${(event: MouseEvent) => event.preventDefault()}
              @click=${() => this.choose(command)}
            >
              <span>${command.label}</span
              >${command.description ? html`<span class="description">${command.description}</span>` : nothing}${command.disabled ? html`<span class="description">Unavailable</span>` : nothing}
            </div>`,
        )}
      </div>
      <p class="status" role="status">
        ${this.loading ? 'Loading commands…' : commands.length ? `${commands.length} commands` : 'No matching commands.'}
      </p>
    </dialog>`;
  }
}
if (!customElements.get('t-command-palette'))
  customElements.define('t-command-palette', TCommandPalette);
declare global {
  interface HTMLElementTagNameMap {
    't-command-palette': TCommandPalette;
  }
}
