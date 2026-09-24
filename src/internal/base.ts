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
  button,
  a,
  input,
  select,
  textarea,
  [role='tab'],
  [role='option'],
  [role='treeitem'] {
    transition:
      background-color var(--_t-motion-duration, var(--t-motion-fast, 120ms))
        var(--t-motion-ease, ease),
      border-color var(--_t-motion-duration, var(--t-motion-fast, 120ms)) var(--t-motion-ease, ease),
      box-shadow var(--_t-motion-duration, var(--t-motion-fast, 120ms)) var(--t-motion-ease, ease);
  }
  dialog[open],
  [popover]:popover-open {
    animation: var(--_t-motion-name, t-enter)
      var(--_t-motion-duration, var(--t-motion-normal, 180ms)) var(--t-motion-ease, ease);
  }
  [popover]:popover-open {
    animation-name: var(--_t-motion-name, t-fade);
  }
  @keyframes t-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes t-enter {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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
    button:active {
      transform: none !important;
    }
  }
  @media (forced-colors: active), (prefers-contrast: more) {
    :host,
    * {
      text-shadow: none !important;
      box-shadow: none !important;
    }
  }
  @media (forced-colors: active) {
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
