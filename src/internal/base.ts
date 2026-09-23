import { css, LitElement } from 'lit';

export const baseStyles = css`
  :host {
    box-sizing: border-box;
    font-family: var(--t-font, 'Courier New', monospace);
    color: var(--t-text, #eee9d9);
    font-size: var(--t-font-size, 14px);
    line-height: 1.5;
    --_t-edge-glow: 0 0 var(--t-glow-blur, 0px)
      color-mix(in srgb, var(--t-accent) var(--t-glow-strength, 0%), transparent);
    text-shadow: 0 0 var(--t-glow-blur, 0px)
      color-mix(in srgb, currentColor var(--t-glow-strength, 0%), transparent);
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  [hidden] {
    display: none !important;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
  button,
  input,
  select,
  textarea {
    font: inherit;
    text-shadow: inherit;
  }
  button {
    cursor: pointer;
  }
  :focus-visible {
    outline: 2px solid var(--t-focus, #f5ba5b);
    outline-offset: 4px;
  }
  button:disabled,
  input:disabled,
  select:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
  @media (forced-colors: active) {
    :host,
    * {
      text-shadow: none !important;
      box-shadow: none !important;
    }
    button,
    input,
    select,
    textarea {
      border: 1px solid ButtonText !important;
    }
  }
`;

export class TerminalElement extends LitElement {
  protected emit(name: string, detail?: unknown) {
    return this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }
}
