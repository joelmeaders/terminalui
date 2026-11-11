import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TMenu } from '@joelmeaders/terminalui/react/menu';
import { TChip } from '@joelmeaders/terminalui/react/chip';
import { TTable } from '@joelmeaders/terminalui/react/table';
import { TSplitPane } from '@joelmeaders/terminalui/react/split-pane';
import { TDialog } from '@joelmeaders/terminalui/react/dialog';
import { TToast } from '@joelmeaders/terminalui/react/toast';
import type { TDialog as DialogElement } from '@joelmeaders/terminalui/components/dialog';
import type { TToast as ToastElement } from '@joelmeaders/terminalui/components/toast';
import '@joelmeaders/terminalui/themes.css';

function EventFixture() {
  const [events, setEvents] = useState<Record<string, unknown>>({});
  const [selected, setSelected] = useState(false);
  const dialog = useRef<DialogElement | null>(null);
  const toast = useRef<ToastElement | null>(null);
  const record = (name: string, detail: unknown) =>
    setEvents((previous) => ({ ...previous, [name]: detail }));
  return (
    <>
      <h1>React event delivery</h1>
      <TMenu
        label="File actions"
        options={[{ value: 'open', label: 'Open report' }]}
        onTSelect={(event) => {
          const label: string = event.detail.option.label;
          record('menu', { value: event.detail.value, label });
        }}
      />
      <TChip
        label="Archived"
        selectable
        removable
        selected={selected}
        onTToggle={(event) => {
          setSelected(event.detail.selected);
          record('chip-toggle', event.detail);
        }}
        onTRemove={(event) => record('chip-remove', event.detail)}
      />
      <TTable
        caption="Crew"
        rowKey="id"
        columns={[{ key: 'name', label: 'Name', sortable: true }]}
        rows={[
          { id: 1, name: 'Ash' },
          { id: 'two', name: 'Ripley' },
        ]}
        selectable
        onTSort={(event) => record('sort', event.detail)}
        onTSelectionChange={(event) => record('selection', event.detail)}
      />
      <TSplitPane
        primaryLabel="Navigation"
        secondaryLabel="Content"
        stackAt={0}
        onTInput={(event) => record('resize-input', event.detail)}
        onTChange={(event) => record('resize-change', event.detail)}
      >
        <p slot="primary">Navigation content</p>
        <p slot="secondary">Main content</p>
      </TSplitPane>
      <button type="button" onClick={(event) => dialog.current?.show(event.currentTarget)}>
        Open dialog
      </button>
      <TDialog
        ref={dialog}
        heading="Confirm action"
        onTClose={(event) => {
          const detail: null = event.detail;
          record('dialog-close', detail);
        }}
      >
        <p>Review the selected action.</p>
        <button type="button" onClick={() => dialog.current?.close()}>
          Done
        </button>
      </TDialog>
      <button type="button" onClick={(event) => toast.current?.show('Saved.', event.currentTarget)}>
        Show notification
      </button>
      <button type="button" onClick={() => toast.current?.close()}>
        Close notification
      </button>
      <TToast
        ref={toast}
        duration={1000}
        onTClose={(event) => record('toast-close', event.detail.reason)}
      />
      <output id="event-log" aria-label="Received events">
        {JSON.stringify(events)}
      </output>
    </>
  );
}

createRoot(document.getElementById('fixture')!).render(<EventFixture />);
