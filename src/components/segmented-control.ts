import { css } from 'lit';
import { TRadioGroup } from './radio-group';

/** Native radio choices with segmented presentation. Uses options: {value,label,disabled?}[] and a string value. */
export class TSegmentedControl extends TRadioGroup {
  orientation: 'vertical' | 'horizontal' = 'horizontal';
  static styles = [
    ...TRadioGroup.styles,
    css`
      .options,
      :host([orientation='horizontal']) .options {
        gap: 4px;
      }
      label {
        padding: 8px 12px;
        min-height: var(--t-control-height, 42px);
        max-width: 100%;
        overflow-wrap: anywhere;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        background: var(--t-bg);
      }
      label:has(input:checked) {
        background: var(--t-raised);
        border-color: var(--t-accent);
        font-weight: 700;
      }
      label:has(input:focus-visible) {
        outline: 2px solid var(--t-focus);
        outline-offset: 2px;
      }
      @media (forced-colors: active) {
        label {
          border-color: ButtonText;
        }
        label:has(input:checked) {
          border-color: Highlight;
        }
      }
    `,
  ];
}
if (!customElements.get('t-segmented-control'))
  customElements.define('t-segmented-control', TSegmentedControl);
declare global {
  interface HTMLElementTagNameMap {
    't-segmented-control': TSegmentedControl;
  }
}
