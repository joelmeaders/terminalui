import { html } from 'lit';

export function dockDemo(log: (message: string) => void) {
  return html`
    <section id="dock" aria-labelledby="dock-heading">
      <div class="section-heading">
        <h2 id="dock-heading">Your workspace, your order</h2>
        <span>LAYOUT / DOCK</span>
      </div>
      <p>Select Edit to rearrange the controls. Dock settings offers position and size controls.</p>
      <div class="dock-workspace" style="position:relative;min-height:420px;min-width:0">
        <t-dock label="Mission dock" width="640" height="112">
          <t-button
            data-dock-id="archive"
            data-dock-label="Archive"
            @click=${() => log('Dock archive opened.')}
            >Archive</t-button
          >
          <hr data-dock-id="separator" data-dock-label="Command separator" />
          <t-input
            data-dock-id="filter"
            data-dock-label="Record filter"
            label="Filter dock records"
            value="missions"
          ></t-input>
          <t-button
            data-dock-id="refresh"
            data-dock-label="Refresh"
            variant="secondary"
            @click=${() => log('Dock records refreshed.')}
            >Refresh</t-button
          >
        </t-dock>
      </div>
    </section>
  `;
}
