import { css } from 'lit';

/** Keep empty optional slots out of flex layout, including after dynamic removal. */
export function syncSlot(event: Event) {
  const slot = event.target as HTMLSlotElement;
  slot.toggleAttribute('data-filled', slot.assignedElements().length > 0);
}

export const optionalSlotStyles = css`
  slot[data-optional] {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  slot[data-optional]:not([data-filled]) {
    display: none;
  }
`;

/** Affixes stay outside the native label and become inert with their field. */
export const fieldSlotStyles = css`
  .field-row {
    display: flex;
    align-items: center;
    min-width: 0;
    font-size: 13px;
  }
  .field-row > input,
  .field-row > select {
    flex: 1;
    min-width: 0;
  }
  .field-row:has(slot[data-filled]) {
    border: var(--t-line-width, 1px) solid var(--t-control-border);
    box-shadow: var(--_t-edge-glow);
    background: var(--t-bg);
  }
  .field-row:has(slot[data-filled]) > input,
  .field-row:has(slot[data-filled]) > select {
    border: 0;
    box-shadow: none;
    min-height: calc(var(--t-control-height, 42px) - 2 * var(--t-line-width, 1px));
  }
  .field-row:has([aria-invalid='true']):has(slot[data-filled]) {
    border-color: var(--t-danger);
  }
  .field-row:has(slot[data-filled]):has(> input:focus, > select:focus) {
    outline: 2px solid var(--t-focus);
    outline-offset: 2px;
  }
  .field-row:has(slot[data-filled]) > input:focus,
  .field-row:has(slot[data-filled]) > select:focus {
    outline: none;
  }
  .field-row slot {
    flex-shrink: 0;
    max-width: 40%;
  }
  .field-row slot[name='start'] {
    margin-inline-start: 12px;
  }
  .field-row slot[name='end'] {
    margin-inline-end: 12px;
  }
  .field-row slot[inert] {
    opacity: 0.55;
  }
  @media (forced-colors: active) {
    .field-row:has(slot[data-filled]) {
      border-color: ButtonText;
      outline-color: Highlight;
    }
    .field-row:has(slot[data-filled]) > input,
    .field-row:has(slot[data-filled]) > select {
      border: 0 !important;
    }
  }
`;

/** Preserve inline wrapping and use logical spacing in text links/disclosures. */
export const inlineSlotStyles = css`
  ::slotted([slot='start']) {
    margin-inline-end: 0.5em;
    vertical-align: middle;
  }
  ::slotted([slot='end']) {
    margin-inline-start: 0.5em;
    vertical-align: middle;
  }
`;
