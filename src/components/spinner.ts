import { css, html } from 'lit';
import { baseStyles, HullframeElement } from '../internal/base';

export type SpinnerType =
  | 'ring'
  | 'dots'
  | 'bars'
  | 'pulse'
  | 'orbit'
  | 'cursor'
  | 'cursor-box'
  | 'arrow'
  | 'pixels'
  | 'blocks';

/**
 * Indeterminate activity indicator with a stable, polite status label.
 *
 * @csspart indicator - Visual loading indicator.
 *
 * @csspart item - Individual dot, bar, pixel, cursor, or arrow.
 *
 * @cssprop --t-spinner-color - Indicator color. Defaults to the theme accent.
 */
export class TSpinner extends HullframeElement {
  static properties = {
    label: {},
    size: { reflect: true },
    type: { reflect: true },
    steps: { type: Number, reflect: true },
  };
  label = 'Loading';
  size = 'medium';
  type: SpinnerType = 'ring';
  /** Number of fixed arrow positions. Accepts 6 or 8. Other values use 8. */
  steps: 6 | 8 = 8;
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline-flex;
        --_t-spinner-size: 24px;
      }
      :host([size='small']) {
        --_t-spinner-size: 16px;
      }
      :host([size='large']) {
        --_t-spinner-size: 40px;
      }
      .indicator {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--_t-spinner-size);
        height: var(--_t-spinner-size);
        color: var(--t-spinner-color, var(--t-accent));
      }
      .item {
        display: block;
        background: currentColor;
      }
      .ring {
        display: block;
        border: var(--t-selection-width, 2px) solid var(--t-border);
        border-top-color: currentColor;
        border-radius: 50%;
        animation: var(--_t-motion-name, rotate) 900ms linear infinite;
      }
      .dots,
      .bars {
        gap: 12%;
      }
      .dots .item {
        width: 24%;
        height: 24%;
        border-radius: 50%;
        animation: var(--_t-motion-name, bounce) 1200ms ease-in-out infinite;
        animation-delay: calc(var(--_t-i) * -160ms);
      }
      .bars {
        gap: 10%;
      }
      .bars .item {
        width: 15%;
        height: 80%;
        animation: var(--_t-motion-name, stretch) 1000ms ease-in-out infinite;
        animation-delay: calc(var(--_t-i) * -120ms);
      }
      .pulse .item {
        width: 75%;
        height: 75%;
        border-radius: 50%;
        animation: var(--_t-motion-name, pulse) 1400ms ease-in-out infinite;
      }
      .orbit {
        border: 1px solid var(--t-border);
        border-radius: 50%;
        animation: var(--_t-motion-name, rotate) 1200ms linear infinite;
      }
      .orbit .item {
        position: absolute;
        width: 25%;
        height: 25%;
        border-radius: 50%;
        top: 0;
      }
      .orbit .item + .item {
        top: auto;
        bottom: 0;
        width: 17%;
        height: 17%;
      }
      .cursor .item,
      .cursor-box .item {
        width: 60%;
        height: 12%;
        align-self: flex-end;
        margin-bottom: 12%;
        animation: var(--_t-motion-name, blink) 1200ms steps(1, end) infinite;
      }
      .cursor-box .item {
        height: 76%;
      }
      .arrow {
        animation: var(--_t-motion-name, rotate) 1200ms steps(var(--_t-steps), end) infinite;
      }
      .arrow .item {
        width: 100%;
        height: 100%;
        background: none;
        fill: none;
        stroke: currentColor;
        stroke-width: var(--t-selection-width, 2px);
        stroke-linecap: square;
        stroke-linejoin: miter;
      }
      .pixels {
        display: grid;
        grid-template: repeat(3, 1fr) / repeat(3, 1fr);
        gap: 12%;
      }
      .pixels .item {
        width: 100%;
        height: 100%;
        opacity: 0.35;
        animation: var(--_t-motion-name, chase) 1600ms steps(1, end) infinite;
        animation-delay: calc(var(--_t-i) * -200ms);
      }
      .pixels .item:first-child {
        opacity: 1;
      }
      .blocks {
        display: grid;
        grid-template: repeat(2, 1fr) / repeat(2, 1fr);
        gap: 16%;
      }
      .blocks .item {
        width: 100%;
        height: 100%;
        animation: var(--_t-motion-name, block-step) 1600ms steps(1, end) infinite;
        animation-delay: calc(var(--_t-i) * -400ms);
      }
      @keyframes rotate {
        to {
          transform: rotate(360deg);
        }
      }
      @keyframes bounce {
        0%,
        60%,
        100% {
          transform: translateY(0);
        }
        30% {
          transform: translateY(-90%);
        }
      }
      @keyframes stretch {
        0%,
        100% {
          transform: scaleY(0.4);
        }
        50% {
          transform: scaleY(1);
        }
      }
      @keyframes pulse {
        0%,
        100% {
          transform: scale(0.6);
        }
        50% {
          transform: scale(1);
        }
      }
      @keyframes blink {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0;
        }
      }
      @keyframes chase {
        0% {
          opacity: 1;
        }
        12.5%,
        100% {
          opacity: 0.35;
        }
      }
      @keyframes block-step {
        0%,
        100% {
          transform: scale(1);
        }
        25% {
          transform: scale(0.5);
        }
      }
      @media (forced-colors: active) {
        .indicator {
          color: CanvasText;
        }
        .item {
          background: CanvasText;
        }
        .arrow .item {
          background: none;
        }
        .ring {
          border-color: GrayText;
          border-top-color: CanvasText;
        }
      }
    `,
  ];
  private items(count: number) {
    return Array.from(
      { length: count },
      (_, i) => html`<span class="item" part="item" style=${`--_t-i:${i}`}></span>`,
    );
  }
  private indicator() {
    switch (this.type) {
      case 'dots':
      case 'bars':
        return html`<span class=${`indicator ${this.type}`} part="indicator" aria-hidden="true"
          >${this.items(this.type === 'dots' ? 3 : 4)}</span
        >`;
      case 'pulse':
      case 'orbit':
      case 'cursor':
      case 'cursor-box':
      case 'blocks':
        return html`<span class=${`indicator ${this.type}`} part="indicator" aria-hidden="true"
          >${this.items(this.type === 'orbit' ? 2 : this.type === 'blocks' ? 4 : 1)}</span
        >`;
      case 'arrow':
        return html`<span
          class="indicator arrow"
          part="indicator"
          aria-hidden="true"
          style=${`--_t-steps:${this.steps === 6 ? 6 : 8}`}
          ><svg class="item" part="item" viewBox="0 0 24 24" focusable="false">
            <path d="M12 20V4M5 11l7-7 7 7"></path></svg
        ></span>`;
      case 'pixels':
        // Clockwise positions around a vacant center. Reverse delays move the highlight forward.
        return html`<span class="indicator pixels" part="indicator" aria-hidden="true"
          >${[
            [1, 1],
            [1, 2],
            [1, 3],
            [2, 3],
            [3, 3],
            [3, 2],
            [3, 1],
            [2, 1],
          ].map(
            ([row, column], i) =>
              html`<span
                class="item"
                part="item"
                style=${`--_t-i:${-i};grid-row:${row};grid-column:${column}`}
              ></span>`,
          )}</span
        >`;
      default:
        return html`<span class="indicator ring" part="indicator" aria-hidden="true"></span>`;
    }
  }
  render() {
    return html`<span role="status"
      >${this.indicator()}<span class="visually-hidden">${this.label}</span></span
    >`;
  }
}
if (!customElements.get('t-spinner')) customElements.define('t-spinner', TSpinner);
declare global {
  interface HTMLElementTagNameMap {
    't-spinner': TSpinner;
  }
}
