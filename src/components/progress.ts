import { css, html, nothing } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
/** Native progress indicator. Omit value for an indeterminate task. */
export class TProgress extends TerminalElement {
  static properties = { value: { type: Number }, max: { type: Number }, label: {} };
  value: number | undefined;
  max = 100;
  label = 'Progress';
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }
      label {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        margin-bottom: 8px;
      }
      span {
        color: var(--t-accent);
      }
      progress {
        display: block;
        appearance: none;
        border: var(--t-line-width, 1px) solid var(--t-border);
        box-shadow: var(--_t-edge-glow);
        width: 100%;
        height: 12px;
        background: var(--t-bg);
        accent-color: var(--t-accent);
      }
      progress::-webkit-progress-bar {
        background: var(--t-bg);
      }
      progress::-webkit-progress-value {
        background: var(--t-accent);
        transition: width var(--_t-motion-duration, var(--t-motion-normal, 180ms))
          var(--t-motion-ease, ease);
      }
      progress::-moz-progress-bar {
        background: var(--t-accent);
        transition: width var(--_t-motion-duration, var(--t-motion-normal, 180ms))
          var(--t-motion-ease, ease);
      }
      progress:indeterminate {
        background: repeating-linear-gradient(90deg, var(--t-accent) 0 8px, var(--t-bg) 8px 16px);
        background-size: 32px 100%;
        animation: var(--_t-motion-name, working) 900ms linear infinite;
      }
      progress:indeterminate::-webkit-progress-bar {
        background: transparent;
      }
      progress:indeterminate::-moz-progress-bar {
        background: transparent;
      }
      @keyframes working {
        to {
          background-position: 32px 0;
        }
      }
    `,
  ];
  render() {
    const max = Number.isFinite(this.max) && this.max > 0 ? this.max : 100;
    const value =
      this.value === undefined || !Number.isFinite(this.value)
        ? undefined
        : Math.min(max, Math.max(0, this.value));
    return html`<label for="progress"
        >${this.label}<span
          >${value === undefined ? 'Working…' : `${Math.round((value / max) * 100)}%`}</span
        ></label
      ><progress part="progress" id="progress" max=${max} value=${value ?? nothing}></progress>`;
  }
}
customElements.define('t-progress', TProgress);
declare global {
  interface HTMLElementTagNameMap {
    't-progress': TProgress;
  }
}
