import { css, html } from 'lit';
import { baseStyles, HullframeElement } from '../internal/base';
import './icon';
/**
 * Empty content guidance.
 * @slot - Supporting text.
 * @slot actions - Recovery actions.
 * @slot icon - Decorative illustration.
 * @csspart body - Container.
 */
export class TEmptyState extends HullframeElement {
  static properties = { heading: {} };
  heading = 'Nothing here yet';
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }
      .body {
        padding: 32px var(--t-space, 16px);
        text-align: center;
        border: var(--t-line-width, 1px) dashed var(--t-border);
      }
      .icon {
        color: var(--t-accent);
        margin-bottom: 12px;
      }
      h3 {
        margin: 0 0 8px;
        font-size: 16px;
      }
      .description {
        color: var(--t-muted);
        font-size: 13px;
      }
      .actions {
        margin-top: 20px;
        display: flex;
        justify-content: center;
        gap: 12px;
        flex-wrap: wrap;
      }
    `,
  ];
  render() {
    return html`<div class="body" part="body">
      <div class="icon" aria-hidden="true">
        <slot name="icon"><t-icon name="folder" size="32"></t-icon></slot>
      </div>
      <h3>${this.heading}</h3>
      <div class="description"><slot></slot></div>
      <div class="actions"><slot name="actions"></slot></div>
    </div>`;
  }
}
if (!customElements.get('t-empty-state')) customElements.define('t-empty-state', TEmptyState);
declare global {
  interface HTMLElementTagNameMap {
    't-empty-state': TEmptyState;
  }
}
