import { css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { baseStyles, HullframeElement } from '../internal/base';
import { recoverFocus } from '../internal/floating';

export interface StepItem {
  id: string;
  label: string;
  description?: string;
  status?: 'pending' | 'complete' | 'error';
  disabled?: boolean;
}
/**
 * Ordered step navigation. Applications own the associated content and validation.
 *
 * @fires {CustomEvent<{ value: string; index: number; step: StepItem }>} t-select - User selects a step: `{ value, index, step }`.
 *
 * @csspart nav - Navigation landmark.
 *
 * @csspart step - Native step button.
 */
export class TSteps extends HullframeElement {
  static properties = {
    items: { attribute: false },
    value: {},
    label: {},
    orientation: { reflect: true },
  };
  /** Ordered steps with unique IDs. Replace the array to update content. */
  items: StepItem[] = [];
  /** Current step ID. Defaults to the first enabled step. */
  value = '';
  /** Accessible navigation name. */
  label = 'Steps';
  /** Preferred layout. Horizontal steps wrap on narrow screens. */
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  private focusedStep?: { from: HTMLElement; id: string; index: number };
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      ol {
        display: flex;
        flex-wrap: wrap;
        gap: var(--t-space, 16px);
        list-style: none;
        padding: 0;
        margin: 0;
      }
      li {
        flex: 1 1 160px;
        min-width: 0;
      }
      :host([orientation='vertical']) ol {
        flex-direction: column;
      }
      :host([orientation='vertical']) li {
        flex-basis: auto;
      }
      button {
        display: flex;
        align-items: start;
        gap: 12px;
        width: 100%;
        min-height: var(--t-control-height, 42px);
        padding: 12px;
        text-align: start;
        color: var(--t-text);
        background: var(--t-surface);
        border: var(--t-line-width, 1px) solid var(--t-control-border);
        box-shadow: var(--_t-edge-glow);
      }
      button[aria-current='step'] {
        border-color: var(--t-accent);
        background: var(--t-raised);
      }
      .number {
        flex: none;
        color: var(--t-accent);
      }
      .text {
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .label,
      .description,
      .state {
        display: block;
      }
      .label {
        font-weight: bold;
      }
      .description,
      .state {
        color: var(--t-muted);
      }
    `,
  ];
  protected willUpdate(_changed: PropertyValues) {
    const from = this.shadowRoot?.activeElement as HTMLElement | null;
    const actions = [...this.renderRoot.querySelectorAll<HTMLButtonElement>('[part=step]')];
    this.focusedStep =
      from?.getAttribute('part') === 'step' || from?.localName === 'nav'
        ? {
            from,
            id: from.dataset.stepId ?? '',
            index: Math.max(0, actions.indexOf(from as HTMLButtonElement)),
          }
        : undefined;
    if (this.items.length && !this.items.some((item) => item.id === this.value))
      this.value = this.items.find((item) => !item.disabled)?.id ?? '';
  }
  protected updated() {
    const focused = this.focusedStep;
    this.focusedStep = undefined;
    if (!focused || !this.ownerDocument.hasFocus()) return;
    const enabled = [
      ...this.renderRoot.querySelectorAll<HTMLButtonElement>('[part=step]:not(:disabled)'),
    ];
    const target =
      enabled.find((button) => button.dataset.stepId === focused.id) ??
      enabled[Math.min(focused.index, enabled.length - 1)] ??
      this.renderRoot.querySelector<HTMLElement>('nav');
    recoverFocus(focused.from, target);
  }
  disconnectedCallback() {
    this.focusedStep = undefined;
    super.disconnectedCallback();
  }
  private select(step: StepItem, index: number) {
    if (step.disabled) return;
    this.value = step.id;
    this.emit('t-select', { value: step.id, index, step });
  }
  render() {
    return html`<nav part="nav" aria-label=${this.label} tabindex="-1">
      <ol>
        ${repeat(
          this.items,
          (step) => step.id,
          (step, index) =>
            html`<li>
              <button
                type="button"
                part="step"
                data-step-id=${step.id}
                ?disabled=${step.disabled}
                aria-current=${step.id === this.value ? 'step' : nothing}
                @click=${() => this.select(step, index)}
              >
                <span class="number" aria-hidden="true"
                  >${step.status === 'complete' ? '✓' : step.status === 'error' ? '!' : index + 1}</span
                ><span class="text"
                  ><span class="label">${step.label}</span
                  >${step.description ? html`<span class="description">${step.description}</span>` : nothing}<span
                    class="state"
                    >${step.id === this.value ? 'Current step. ' : ''}${step.status === 'complete' ? 'Complete' : step.status === 'error' ? 'Needs attention' : step.disabled ? 'Unavailable' : 'Pending'}</span
                  ></span
                >
              </button>
            </li>`,
        )}
      </ol>
      ${this.items.length ? nothing : html`<p role="status">No steps available.</p>`}
    </nav>`;
  }
}
if (!customElements.get('t-steps')) customElements.define('t-steps', TSteps);
declare global {
  interface HTMLElementTagNameMap {
    't-steps': TSteps;
  }
}
