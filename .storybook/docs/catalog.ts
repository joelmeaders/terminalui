/** One example recipe per component. All four framework examples use this data. */
export interface ExampleNode {
  tag: string;
  props?: Record<string, unknown>;
  attrs?: Record<string, string>;
  children?: (ExampleNode | string)[];
}
export interface ComponentGuide {
  purpose: string;
  usage: string[];
  accessibility: string[];
  example: Omit<ExampleNode, 'tag'>;
  event?: { name: string; read: string; description: string };
  action?: { label: string; method: 'show' };
  form?: 'value' | 'values' | 'checked' | 'files';
  guide?: 'icons' | 'spinners';
}
const choices = [
  { value: 'archive', label: 'Archive' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'restricted', label: 'Restricted', disabled: true },
];
const valueEvent = {
  name: 'input',
  read: 'target.value',
  description:
    'Read the new string from event.target.value. Programmatic updates do not emit input.',
};
const checkedEvent = {
  name: 'change',
  read: 'target.checked',
  description: 'Read the boolean from event.target.checked.',
};
const selectEvent = {
  name: 't-select',
  read: 'detail.value',
  description: 'Read the selected identifier from event.detail.value.',
};
const fieldAccess = [
  'Use a visible label. Help and error text are associated with the native field inside its shadow root.',
  'Provide name for form submission. Set error for application feedback and use native validity or framework validators for rules.',
];
const field = (
  purpose: string,
  props: Record<string, unknown>,
  usage: string[] = [],
  extra: Partial<ComponentGuide> = {},
): ComponentGuide => ({
  purpose,
  usage: ['Participates in native forms, disabled fieldsets, validation, and reset.', ...usage],
  accessibility: fieldAccess,
  example: { props },
  event: valueEvent,
  form: 'value',
  ...extra,
});
export const guides: Record<string, ComponentGuide> = {
  't-accordion': {
    purpose: 'Reveal optional details without leaving the page.',
    usage: [
      'Use a short question or section name as the label. Put the answer in the default slot.',
      'Set open to expand it programmatically. Each accordion works independently.',
    ],
    accessibility: [
      'The native disclosure supports Enter and Space. Keep essential information outside collapsed content.',
    ],
    example: {
      props: { label: 'What happens to my data?' },
      children: ['Your files stay in this workspace.'],
    },
    event: {
      name: 't-toggle',
      read: 'detail.open',
      description: 'The detail.open boolean reports the expanded state.',
    },
  },
  't-alert': {
    purpose: 'Keep relevant feedback beside the task it explains.',
    usage: [
      'Choose info, success, warning, or danger. Put the message in the default slot.',
      'Use dismissible for optional notices. A dismissal hides this instance; remove or replace it when your application no longer needs it.',
    ],
    accessibility: [
      'Use urgent only for an interruption that must be announced immediately. Include text that explains the status.',
    ],
    example: {
      props: { variant: 'success', dismissible: true },
      children: ['Your configuration was saved.'],
    },
    event: {
      name: 't-dismiss',
      read: 'detail',
      description: 'The notice was dismissed. No payload is required.',
    },
  },
  't-avatar': {
    purpose: 'Identify a person with an image or initials.',
    usage: [
      'Set name for the accessible identity and initials. Add src for an image.',
      'A missing or failed image falls back to initials. Sizes are small, medium, and large.',
    ],
    accessibility: [
      'Use a meaningful name. An adjacent profile link needs its own accessible name.',
    ],
    example: { props: { name: 'Ellen Ripley', size: 'large' } },
  },
  't-badge': {
    purpose: 'Summarize a compact state such as Ready or Offline.',
    usage: [
      'Place status text in the default slot. Variants are neutral, success, warning, danger, and accent.',
      'Use an alert or toast when a new status needs an announcement.',
    ],
    accessibility: ['Always include text. A badge is not an interactive button or a live region.'],
    example: { props: { variant: 'success' }, children: ['Operational'] },
  },
  't-breadcrumb': {
    purpose: 'Show the current location within a hierarchy.',
    usage: [
      'Supply items with label and optional href/current. The final item is current by default.',
      'Use real application URLs for preceding locations. Replace the items array when navigation changes.',
    ],
    accessibility: [
      'Give multiple breadcrumb landmarks distinct labels. The current item exposes aria-current.',
    ],
    example: {
      props: {
        label: 'Project location',
        items: [
          { label: 'Home', href: '/' },
          { label: 'Projects', href: '/projects' },
          { label: 'Archive' },
        ],
      },
    },
  },
  't-button': {
    purpose: 'Start an action or submit a form.',
    usage: [
      'Use type="submit" or type="reset" inside a form. The default type is button.',
      'Variants are primary, secondary, ghost, and danger. Sizes are small, medium, and large.',
      'Set loading while an action is pending. Loading also blocks repeat activation.',
    ],
    accessibility: [
      'Use a specific action label in the default slot. Native keyboard and disabled behavior are preserved.',
      'Keep completion and error feedback available after loading ends.',
    ],
    example: { props: { variant: 'primary' }, children: ['Save configuration'] },
    event: {
      name: 'click',
      read: 'type',
      description:
        'Listen for the native click event. A submit button also submits its associated form.',
    },
  },
  't-chip': {
    purpose: 'Show one compact filter or token, with optional selection and removal actions.',
    usage: [
      'Set label to the visible text. Variants are neutral, accent, success, warning, and danger; sizes are small, medium, and large.',
      'Set selectable for a pressed button. User activation changes selected and emits t-toggle with detail.selected and detail.label.',
      'Set removable for a separate named button. t-remove requests removal but keeps the element in place. Remove it in your application and move focus to a logical next control.',
      'Start and end slots accept decorative icons. Use t-tags-input when editable tokens must submit through a form.',
    ],
    accessibility: [
      'Selection uses a native button with aria-pressed. The removal button says Remove followed by the label. Both actions work with Enter and Space.',
      'Keep labels meaningful and state visible beyond color. Preserve a focus destination when removing a focused chip.',
      'Disabled actions cannot toggle or request removal. Static chips are text, not buttons.',
    ],
    example: {
      props: {
        label: 'Engineering',
        variant: 'accent',
        selectable: true,
        removable: true,
      },
      children: [{ tag: 't-icon', attrs: { slot: 'start' }, props: { name: 'folder' } }],
    },
    event: {
      name: 't-toggle',
      read: 'detail.selected',
      description:
        'Read the pressed state from event.detail.selected. Removal sends t-remove with detail.label and leaves DOM removal and focus placement to your application.',
    },
  },
  't-card': {
    purpose: 'Group related content with a heading and optional footer.',
    usage: [
      'Use heading and footer slots around the default body slot.',
      'Compose controls inside the card. The card itself is not clickable.',
    ],
    accessibility: [
      'Use a real heading element in the heading slot when the content introduces a document section.',
    ],
    example: {
      children: [
        { tag: 'h2', attrs: { slot: 'heading' }, children: ['Mission archive'] },
        { tag: 'p', children: ['Your workspace is ready.'] },
        { tag: 'span', attrs: { slot: 'footer' }, children: ['Updated just now'] },
      ],
    },
  },
  't-calendar': {
    purpose: 'Choose one date from an inline, terminal-styled calendar.',
    usage: [
      'Use a YYYY-MM-DD value and optional min/max bounds. month sets the displayed YYYY-MM month.',
      'An invalid or out-of-range programmatic value stays unchanged and shows a status. Choosing an available date corrects it.',
      'Set firstDayOfWeek from 0 (Sunday) through 6 (Saturday). locale controls month, weekday, and date names.',
      'The calendar is a selection widget, not a form field. Use t-date-picker or t-date-range-picker for typed entry, validation, and FormData.',
      'Set range with rangeStart and rangeEnd to mark an interval. Selection events still identify one chosen day.',
    ],
    accessibility: [
      'One day is in the Tab order. Arrow keys move by day or week; Home/End move within a week; Page Up/Down move by month and Shift moves by year.',
      'Month navigation has named buttons, the month heading announces changes, and selected and unavailable days have grid states.',
      'Check calendar speech and touch behavior with your target assistive technologies before release.',
    ],
    example: {
      props: {
        label: 'Mission date',
        value: '2026-09-24',
        month: '2026-09',
        min: '2026-09-01',
        max: '2026-10-31',
        locale: 'en-US',
        firstDayOfWeek: 1,
      },
    },
    event: {
      name: 't-change',
      read: 'detail.value',
      description:
        'Read the selected ISO date from detail.value. Programmatic value changes do not emit an event.',
    },
  },
  't-date-picker': {
    purpose: 'Enter or choose one date in a form-associated terminal field.',
    usage: [
      'Type a complete YYYY-MM-DD date, or open the modal calendar and select a day.',
      'Use name for FormData and required, min, and max for validation. Empty optional fields submit an empty value.',
      'The input keeps ISO order in every locale. locale and firstDayOfWeek control the calendar presentation.',
      'Set readonly to keep the submitted value without allowing edits. disabled omits the value from FormData.',
    ],
    accessibility: [
      'The native text field has a visible label, format instruction, and one changing error description.',
      'The named calendar button opens a modal. Focus moves to the selected or current day. Escape cancels and returns focus to the button.',
      'The date grid supports arrows, Home/End, Page Up/Down, and Shift+Page Up/Down. Test speech and touch with target devices before release.',
    ],
    example: {
      props: {
        name: 'mission',
        label: 'Mission date',
        value: '2026-09-24',
        min: '2026-09-01',
        max: '2026-10-31',
        locale: 'en-US',
        firstDayOfWeek: 1,
        required: true,
      },
    },
    event: {
      name: 'input',
      read: 'target.value',
      description:
        'Read the ISO date from event.target.value after typing or calendar selection. Calendar selection also emits t-change with detail.value.',
    },
    form: 'value',
  },
  't-date-range-picker': {
    purpose: 'Enter or choose a start and end date as one form value.',
    usage: [
      'Enter two YYYY-MM-DD dates, or open the calendar and choose a start followed by an end.',
      'value uses START/END, such as 2026-09-24/2026-10-01. FormData submits that one string under name.',
      'Calendar choices stay in a draft until both days are selected. Escape cancels the draft. Choosing an earlier second day starts a new draft.',
      'required needs both dates. min and max bound each date; the end cannot precede the start.',
      'readonly keeps the submitted range without edits. disabled omits it from FormData.',
    ],
    accessibility: [
      'A native fieldset names the two labeled text inputs. A visible format note and one error message describe them.',
      'The calendar button opens a modal and moves focus into the date grid. A polite instruction changes once when selection moves from start to end.',
      'The grid names range endpoints and marks intervening dates. Escape returns focus without changing the form value. Test speech and touch with target devices.',
    ],
    example: {
      props: {
        name: 'mission',
        label: 'Mission window',
        value: '2026-09-24/2026-10-01',
        min: '2026-09-01',
        max: '2026-10-31',
        locale: 'en-US',
        firstDayOfWeek: 1,
        required: true,
      },
    },
    event: {
      name: 'input',
      read: 'target.value',
      description:
        'Read START/END from event.target.value after typing or a completed calendar selection. Calendar completion also emits t-change with detail.start, detail.end, and detail.value.',
    },
    form: 'value',
  },
  't-time-picker': {
    purpose: 'Enter or choose a 24-hour time in a form-associated terminal field.',
    usage: [
      'Type HH:mm, such as 09:30, or open the modal and choose hours and minutes. The value has no date or timezone.',
      'Use name for FormData and required, min, and max for validation. Bounds use HH:mm and do not span midnight.',
      'Use time applies a draft. Cancel or Escape leaves the submitted value unchanged.',
      'readonly keeps the submitted value without allowing edits. disabled omits it from FormData.',
    ],
    accessibility: [
      'The native text field has a visible label, a 24-hour format instruction, and a changing error description.',
      'The named trigger opens a modal with labeled native hour and minute selects. Unavailable choices are disabled.',
      'Focus moves to hours when the modal opens and returns to the trigger when it closes. Test speech and touch with target devices.',
    ],
    example: {
      props: {
        name: 'launch',
        label: 'Launch time',
        value: '09:30',
        min: '08:00',
        max: '18:00',
        required: true,
      },
    },
    event: {
      name: 'input',
      read: 'target.value',
      description:
        'Read HH:mm from event.target.value after typing or applying a choice. Applying a changed choice also emits t-change with detail.value.',
    },
    form: 'value',
  },
  't-checkbox': field(
    'Choose an independent boolean option.',
    { name: 'telemetry', label: 'Enable telemetry', checked: true },
    [
      'checked controls selection; value controls the submitted value (default on). Unchecked boxes are omitted from FormData.',
      'Use switch for a switch presentation, or choose t-switch.',
    ],
    { form: 'checked', event: checkedEvent },
  ),
  't-color-picker': field(
    'Choose a color through a native picker, text, or named swatches.',
    {
      name: 'color',
      label: 'Marker color',
      value: '#f5ba5b',
      swatches: [
        { value: '#f5ba5b', label: 'Amber' },
        { value: '#a6e88b', label: 'Phosphor' },
      ],
    },
    [
      'Values use six-digit hexadecimal text. Invalid text remains visible and fails validation.',
      'Empty text is allowed unless required. The native picker appearance varies by browser.',
    ],
  ),
  't-combobox': field(
    'Search a list and select one known option.',
    { name: 'department', label: 'Department', options: choices, value: 'archive' },
    [
      'Options use { value, label, disabled? }. Replace the array to update results.',
      'Typing filters the list. Only an enabled option becomes the submitted value. Set loading while your application obtains options.',
    ],
    {
      accessibility: [
        ...fieldAccess,
        'Arrow keys move through options; Enter selects; Escape dismisses the list.',
      ],
    },
  ),
  't-command-palette': {
    purpose: 'Offer searchable application commands in a modal.',
    usage: [
      'Commands use { value, label, description?, keywords?, disabled? }. Supply the available actions; handle selection in the application.',
      'Call show() from an opener. The component does not install a global keyboard shortcut.',
    ],
    accessibility: [
      'Focus moves into the modal. Escape closes it and focus returns to the opener. The background cannot scroll.',
      'Keep command labels specific. Communicate loading and empty results.',
    ],
    example: {
      props: {
        heading: 'Workspace commands',
        commands: [
          { value: 'archive', label: 'Open archive', description: 'Browse saved records' },
          { value: 'settings', label: 'Workspace settings' },
        ],
      },
    },
    event: selectEvent,
    action: { label: 'Find a command', method: 'show' },
  },
  't-copy-button': {
    purpose: 'Copy a known value after a deliberate user action.',
    usage: [
      'Set value to the text to copy and label to the action name.',
      'Clipboard access requires a secure context and browser permission. Handle t-copy-error if the application needs additional recovery.',
    ],
    accessibility: [
      'Focus stays on the button. Success or failure is announced only after the clipboard operation finishes.',
    ],
    example: { props: { value: 'mission --status', label: 'Copy status command' } },
    event: {
      name: 't-copy',
      read: 'detail.value',
      description:
        'Copy succeeded. detail.value contains the copied text. t-copy-error reports failure.',
    },
  },
  't-description-list': {
    purpose: 'Present terms and their corresponding values.',
    usage: [
      'Set items to { term, value } objects. Values render as text.',
      'The default slot accepts additional native dt/dd pairs, optionally grouped in div elements.',
    ],
    accessibility: [
      'Native description-list semantics preserve the relationship between each term and value.',
    ],
    example: {
      props: {
        items: [
          { term: 'Vessel', value: 'Nostromo' },
          { term: 'Status', value: 'Ready' },
        ],
      },
    },
  },
  't-dialog': {
    purpose: 'Focus attention on a decision or contained task.',
    usage: [
      'Set heading and place the body in the default slot. Put actions in footer.',
      'Call show() from an opener and close() after completing or canceling the task.',
    ],
    accessibility: [
      'Native modal semantics, focus containment, Escape, and focus restoration are built in.',
      'The background stays fixed. Long dialog content can scroll. Keep a clear way to close the task.',
    ],
    example: {
      props: { heading: 'Review settings' },
      children: ['Review your configuration before continuing.'],
    },
    action: { label: 'Review settings', method: 'show' },
    event: {
      name: 't-close',
      read: 'detail',
      description: 'The dialog closed and focus restoration ran.',
    },
  },
  't-divider': {
    purpose: 'Separate related groups of content.',
    usage: ['Use vertical inside a row with an explicit height. The default is horizontal.'],
    accessibility: [
      'The component exposes separator semantics and orientation. Do not use it as the only section label.',
    ],
    example: {},
  },
  't-drawer': {
    purpose: 'Edit or inspect a focused task beside the page.',
    usage: [
      'Choose placement="start" or "end". Use the body and footer slots.',
      'Call show() from an opener and close() when the task is complete.',
    ],
    accessibility: [
      'This is a modal drawer: focus stays inside and the background cannot scroll.',
      'Escape closes it and restores focus. Long content remains scrollable.',
    ],
    example: {
      props: { heading: 'Workspace details', placement: 'end' },
      children: ['Archive contains six documents.'],
    },
    action: { label: 'Open workspace details', method: 'show' },
    event: { name: 't-close', read: 'detail', description: 'The drawer closed.' },
  },
  't-empty-state': {
    purpose: 'Explain why an area has no content and what to do next.',
    usage: [
      'Set heading and put useful guidance in the default slot.',
      'Use the icon and actions slots to add a relevant symbol or next action.',
    ],
    accessibility: [
      'Write a concrete heading and useful recovery text. A decorative illustration must not replace that explanation.',
    ],
    example: {
      props: { heading: 'No saved searches' },
      children: ['Save a search to find these records again.'],
    },
  },
  't-file-input': field(
    'Select local files for an application-managed workflow.',
    { name: 'attachments', label: 'Attachments', accept: '.txt,.pdf', multiple: true },
    [
      'Read files as FileList | null. Selection does not upload anything.',
      'accept is a picker hint, not validation of file contents. Validate uploads in your application. Reset clears the selection.',
    ],
    {
      form: 'files',
      event: {
        name: 'change',
        read: 'target.files',
        description:
          'Read the selected FileList from event.target.files. No upload occurs automatically.',
      },
    },
  ),
  't-grid': {
    purpose: 'Arrange content in responsive columns.',
    usage: [
      'With columns=0, columns fit the available width. A positive value limits the column count.',
      'Use --t-grid-min and --t-grid-gap for minimum item width and spacing. Items belong in the default slot.',
    ],
    accessibility: [
      'Keep DOM order meaningful. The grid does not change document semantics or keyboard order.',
    ],
    example: {
      props: { columns: 2 },
      children: [
        { tag: 'p', children: ['Archive'] },
        { tag: 'p', children: ['Engineering'] },
      ],
    },
  },
  't-icon': {
    purpose: 'Display a built-in symbol or a registered SVG icon.',
    usage: [
      'Built-in names work after importing the component. A provider prefix alone does not load an icon.',
      'Register provider data before rendering. The shared registry performs no network requests. See the provider recipes below.',
    ],
    accessibility: [
      'Set label for a meaningful standalone icon. Leave it empty when adjacent text supplies the meaning.',
      'Use t-icon-button when the icon performs an action.',
    ],
    example: { props: { name: 'search', label: 'Search', size: 24 } },
    guide: 'icons',
  },
  't-icon-button': {
    purpose: 'Make a compact action with a clear accessible name.',
    usage: [
      'Set name to a built-in or registered icon key and label to the action.',
      'pressed=null is a normal button. Use true or false for a toggle button and update state in the application.',
    ],
    accessibility: [
      'An action label is required even when a tooltip or nearby icon is present. Native focus and activation remain available.',
    ],
    example: { props: { name: 'settings', label: 'Open settings' } },
    event: { name: 'click', read: 'type', description: 'The named native button was activated.' },
    guide: 'icons',
  },
  't-input': field(
    'Collect a short text value with native input behavior.',
    {
      name: 'callsign',
      label: 'Callsign',
      value: 'RIPLEY',
      required: true,
      help: 'Choose a name for this workspace.',
    },
    [
      'Choose a supported native type and autocomplete value. Use t-textarea for multiple lines.',
      'Use minlength, maxlength, pattern, or native type constraints. SetCustomValidity messages must be cleared when the value becomes valid.',
    ],
  ),
  't-link': {
    purpose: 'Navigate to a destination with a native anchor.',
    usage: [
      'Set href and put link text in the default slot. external opens a new tab with opener protection.',
      'Unsupported URL schemes are rejected. disabled removes actionable navigation.',
    ],
    accessibility: [
      'Use text that identifies the destination. Set label when the slot contains only an icon.',
    ],
    example: { props: { href: '/archive' }, children: ['Browse archive'] },
  },
  't-menu': {
    purpose: 'Offer a short list of actions from one trigger.',
    usage: [
      'Options use { value, label, disabled? }. Handle t-select to run the chosen action.',
      'This is a single-level action menu. Use links or a tree for deeper navigation.',
    ],
    accessibility: [
      'Arrow keys, Home/End, and typeahead move through enabled actions. Escape dismisses and restores focus.',
    ],
    example: {
      props: {
        label: 'File actions',
        options: [
          { value: 'rename', label: 'Rename' },
          { value: 'archive', label: 'Archive' },
        ],
      },
    },
    event: selectEvent,
  },
  't-meter': {
    purpose: 'Display a measurement within a known range.',
    usage: [
      'Set min, max, value, and optional low/high/optimum thresholds.',
      'Use valueText for units or a useful formatted value. Use t-progress for task completion.',
      'Choose solid (default), segmented-thin (2px strokes with 2px gaps), or segmented-thick (6px strokes with 3px gaps). Segment widths stay fixed during the reveal.',
      'Sizes follow the library vocabulary: small (12px, the original/default height), medium (20px), and large (32px). Size changes the track height, not the label.',
      'Add animated to reveal the fill once when the meter first enters the viewport, including a scroll container. Reconnection starts a new entrance. Changing the value or scrolling back does not replay it.',
      'Set --t-meter-duration to change the entrance duration (default: three times --t-motion-slow, normally 720ms). Disable the animated property or use data-motion="off" for immediate display.',
    ],
    accessibility: [
      'Provide a label and understandable units. Do not convey the measurement using color alone.',
      'The native meter exposes the final value and thresholds throughout the animation. Decorative segments are hidden from assistive technology.',
      'Reduced motion and data-motion="off" show the full measurement immediately. Forced colors use the native meter. The fill starts at the inline edge in right-to-left layouts.',
    ],
    example: {
      props: {
        label: 'Storage used',
        value: 42,
        max: 100,
        valueText: '42 GB of 100 GB',
        variant: 'segmented-thin',
        size: 'medium',
        animated: true,
      },
    },
  },
  't-number-input': field(
    'Enter a numeric value with keyboard and step actions.',
    { name: 'crew', label: 'Crew size', value: '4', min: '1', max: '12', step: '1' },
    [
      'The value is a string, including an empty string. Convert it deliberately for application calculations.',
      'stepUp() and stepDown() obey bounds. step="any" permits values without a fixed increment.',
    ],
  ),
  't-pagination': {
    purpose: 'Navigate a bounded set of pages.',
    usage: [
      'total is the record count, pageSize is records per page, and page is one-based.',
      'The component does not fetch or slice records. Use t-change to update displayed data.',
    ],
    accessibility: [
      'The current page is identified, bounds disable unavailable navigation, and all buttons have names.',
    ],
    example: { props: { total: 95, pageSize: 10, page: 1, label: 'Archive pages' } },
    event: {
      name: 't-change',
      read: 'detail.page',
      description: 'detail contains page and pageSize. Load or select the corresponding records.',
    },
  },
  't-password-input': field(
    'Enter a password with an optional visibility action.',
    { name: 'password', label: 'Password', autocomplete: 'current-password', required: true },
    [
      'Choose current-password for sign-in or new-password for creation. Do not place real credentials in examples.',
      'revealed controls visibility. t-visibility-change reports detail.revealed after user activation.',
    ],
  ),
  't-popover': {
    purpose: 'Show nearby settings without blocking the whole page.',
    usage: [
      'Set label for the trigger and heading for the panel. Put interactive content in the default slot.',
      'Placement may change near viewport edges. Use a dialog or drawer for a modal task.',
    ],
    accessibility: [
      'The built-in trigger works with keyboard input. Escape and outside activation dismiss the panel.',
      'Keep content reachable and provide meaningful labels for every control inside.',
    ],
    example: {
      props: { label: 'View details', heading: 'Archive status' },
      children: ['All records are synchronized.'],
    },
    event: {
      name: 't-toggle',
      read: 'detail.open',
      description: 'detail.open reports whether the panel is open.',
    },
  },
  't-progress': {
    purpose: 'Show measured or indeterminate task progress.',
    usage: [
      'Set value and max when completion can be measured. Omit value when the remaining work is unknown.',
      'Update the value from real task progress and remove the indicator when complete.',
    ],
    accessibility: [
      'Provide a task-specific label. Announce completion separately when it is useful. Motion preferences stop indeterminate decoration.',
    ],
    example: { props: { label: 'Uploading records', value: 42, max: 100 } },
  },
  't-radio-group': field(
    'Choose exactly one option from a visible set.',
    { name: 'department', label: 'Department', options: choices, value: 'archive' },
    [
      'Choices use { value, label, disabled? }. Values must be unique.',
      'Use horizontal or vertical orientation. Arrow keys move between enabled native radio choices.',
    ],
  ),
  't-range': field(
    'Choose a value within a continuous numeric range.',
    { name: 'signal', label: 'Signal strength', value: '65', min: 0, max: 100, step: '1' },
    [
      'The submitted value is a numeric string. Use min, max, and step to define the native slider range.',
      'Consider a number input when exact entry matters.',
    ],
  ),
  't-rating': field(
    'Collect a bounded rating.',
    { name: 'rating', label: 'Mission rating', value: '4', max: 5, clearable: true },
    [
      'Use integer strings for selected values; an empty string means unrated. max is clamped to 1–10.',
      'clearable adds a named action. Clearing a required rating makes it invalid.',
    ],
  ),
  't-segmented-control': field(
    'Choose one of a few compact, mutually exclusive modes.',
    {
      name: 'mode',
      label: 'Connection mode',
      options: [
        { value: 'quiet', label: 'Quiet' },
        { value: 'balanced', label: 'Balanced' },
      ],
      value: 'balanced',
    },
    [
      'Uses native radios and a string value. Options have value, label, and optional disabled.',
      'Use tabs when each choice reveals a separate content panel.',
    ],
  ),
  't-select': field(
    'Choose one item from a native select list.',
    { name: 'department', label: 'Department', options: choices, value: 'archive' },
    [
      'Supply options as an array, not a JSON attribute. Each option uses value, label, and optional disabled.',
      'Use t-combobox when users need to search a longer list.',
    ],
  ),
  't-multi-select': field(
    'Choose several items from a labeled set of checkboxes.',
    {
      name: 'departments',
      label: 'Departments',
      options: choices,
      values: ['archive'],
      searchable: true,
      help: 'Choose one or more departments.',
    },
    [
      'Supply unique option values through the options property. Each option has value, label, and optional disabled.',
      'Read and set the values array. The value string is its JSON form. Each selection produces one FormData entry under name.',
      'Use searchable to filter the visible choices. Filtering keeps the current selection.',
    ],
    {
      form: 'values',
      event: {
        name: 'input',
        read: 'target.values',
        description:
          'Read the new string array from event.target.values. Programmatic updates do not emit input.',
      },
      accessibility: [
        'The fieldset names the group. Every choice is a native checkbox with its own label.',
        'The optional filter only changes the visible choices. Selected choices remain selected when the filter changes.',
      ],
    },
  ),
  't-skeleton': {
    purpose: 'Reserve space while content is loading.',
    usage: [
      'Use shape="text", "circle", or "rectangle". Set --t-skeleton-width and --t-skeleton-height to match expected content.',
      'animated is optional and obeys motion preferences. Replace placeholders when real content arrives.',
    ],
    accessibility: [
      'The placeholder is decorative. Put aria-busy on the content region and supply a loading status when needed.',
    ],
    example: {
      props: { shape: 'text', animated: true },
      attrs: { style: '--t-skeleton-width: 80%; --t-skeleton-height: 1.5rem' },
    },
  },
  't-spinner': {
    purpose: 'Indicate work with an unknown completion time.',
    usage: [
      'Choose among ten modern and terminal types. The ring remains the default.',
      'Set size to small, medium, or large. The arrow supports six or eight fixed positions.',
    ],
    accessibility: [
      'Use a task-specific label. Shapes are hidden from assistive technology and keep one stable status message.',
      'Every type keeps a visible static shape when motion is disabled.',
    ],
    example: { props: { type: 'pixels', label: 'Loading archive', size: 'large' } },
    guide: 'spinners',
  },
  't-split-pane': {
    purpose: 'Let users divide space between two related regions.',
    usage: [
      'Supply primary and secondary slots. size is the primary pane percentage, bounded by min and max.',
      'Horizontal panes stack below stackAt CSS pixels. Set stackAt=0 to disable that behavior.',
    ],
    accessibility: [
      'The separator supports arrows, Home/End, and Shift for a larger step. Give the separator and both panes clear labels.',
    ],
    example: {
      props: {
        size: 40,
        label: 'Archive divider',
        primaryLabel: 'Record list',
        secondaryLabel: 'Record details',
      },
      children: [
        { tag: 'p', attrs: { slot: 'primary' }, children: ['Atmospheric survey'] },
        { tag: 'p', attrs: { slot: 'secondary' }, children: ['Survey details and metadata.'] },
      ],
    },
    event: {
      name: 't-change',
      read: 'detail.size',
      description:
        'Committed size, orientation, and source are in detail. t-input reports intermediate resizing.',
    },
  },
  't-stack': {
    purpose: 'Arrange content in a row or column with shared spacing.',
    usage: [
      'Set direction, align, justify, and wrap. Use --t-stack-gap to customize spacing.',
      'Place any content in the default slot. A stack adds layout, not application semantics.',
    ],
    accessibility: [
      'Keep reading order and keyboard order aligned. Allow wrapping for narrow layouts.',
    ],
    example: {
      props: { direction: 'row', wrap: true },
      children: [
        { tag: 't-button', children: ['Initialize'] },
        { tag: 't-button', props: { variant: 'secondary' }, children: ['Settings'] },
      ],
    },
  },
  't-steps': {
    purpose: 'Navigate a multi-step task with visible state.',
    usage: [
      'Items use id, label, and optional description/status/disabled. value selects the current ID.',
      'The application owns panels, validation, and whether users can advance. Use pending, complete, or error status text.',
    ],
    accessibility: [
      'Current-step semantics and named buttons are provided. Keep validation feedback close to the relevant field.',
    ],
    example: {
      props: {
        label: 'Mission setup',
        value: 'configure',
        items: [
          { id: 'configure', label: 'Configure', status: 'pending' },
          { id: 'review', label: 'Review', status: 'pending' },
        ],
      },
    },
    event: selectEvent,
  },
  't-switch': field(
    'Turn a setting on or off.',
    { name: 'notifications', label: 'Enable notifications', checked: true },
    [
      'Uses boolean checked state. Unchecked switches are omitted from native FormData.',
      'Use a checkbox for agreement or selecting items.',
    ],
    { form: 'checked', event: checkedEvent },
  ),
  't-table': {
    purpose:
      'Read structured records with optional local filtering, sorting, paging, and selection.',
    usage: [
      'Provide columns with key, label, and optional sortable. Each key reads a plain-text row value.',
      'Give rows stable unique identifiers through rowKey. Replace arrays when data changes.',
      'Set filterable to show a search field. Query searches the displayed columns. PageSize enables local paging; page is one-based.',
      'Sorting, filtering, and paging are local. The table does not fetch data, virtualize rows, or edit cells. Set loading, emptyText, or noResultsText for those states.',
    ],
    accessibility: [
      'Use a useful caption. Native table semantics and named sorting buttons preserve relationships.',
      'Wide tables scroll horizontally instead of hiding columns. Row selection uses native checkboxes.',
      'Select all applies to the current page after filtering and sorting. Selected keys on other pages remain selected.',
    ],
    example: {
      props: {
        caption: 'Mission records',
        columns: [
          { key: 'name', label: 'Document', sortable: true },
          { key: 'status', label: 'Status' },
        ],
        rows: [
          { id: 'survey', name: 'Atmospheric survey', status: 'Ready' },
          { id: 'crew', name: 'Crew manifest', status: 'In review' },
          { id: 'nav', name: 'Navigation log', status: 'Ready' },
        ],
        rowKey: 'id',
        selectable: true,
        filterable: true,
        pageSize: 2,
      },
    },
    event: {
      name: 't-selection-change',
      read: 'detail.selectedKeys',
      description:
        'detail.selectedKeys contains selected identifiers. t-filter reports query, t-sort reports key and direction, and t-page-change reports page and pageSize.',
    },
  },
  't-tabs': {
    purpose: 'Switch among related panels within the same view.',
    usage: [
      'Supply tabs with unique id, label, and optional disabled. Each ID names the corresponding content slot.',
      'active controls the selected ID. Keyboard navigation activates the next enabled tab automatically.',
      'Set activation="manual" when a panel takes time to appear. Arrows move focus without changing the panel; Enter, Space, or click selects it.',
      'Use orientation="vertical" for a side list. The vertical list moves above its panel on narrow screens.',
    ],
    accessibility: [
      'Give the tablist a label. Horizontal tabs use Left/Right (reversed in RTL); vertical tabs use Up/Down. Home and End reach the first and last enabled tabs.',
      'In manual mode, the selected tab is the entry point when focus returns to the list. Arrow focus does not announce a new panel until activation.',
      'Only the selected panel is visible. Keep the panel content ready when selection changes automatically.',
      'Use links for navigation to different pages.',
    ],
    example: {
      props: {
        label: 'Workspace sections',
        active: 'overview',
        tabs: [
          { id: 'overview', label: 'Overview' },
          { id: 'settings', label: 'Settings' },
        ],
      },
      children: [
        { tag: 'p', attrs: { slot: 'overview' }, children: ['Workspace overview.'] },
        { tag: 'p', attrs: { slot: 'settings' }, children: ['Workspace settings.'] },
      ],
    },
    event: {
      name: 't-change',
      read: 'detail.value',
      description: 'detail.value contains the active tab ID.',
    },
  },
  't-tags-input': field(
    'Collect a list of unique text tags.',
    { name: 'tags', label: 'Mission tags', values: ['survey', 'navigation'] },
    [
      'Enter or comma adds a tag; Backspace in an empty field removes the last tag. Duplicate and empty tags are ignored.',
      'values is a string array; value is its JSON string. FormData contains one entry per tag under name.',
      'Angular forms bind the JSON string value, not the values array. Use maxTags to limit the count.',
    ],
  ),
  't-textarea': field(
    'Collect multiline text.',
    {
      name: 'notes',
      label: 'Mission notes',
      rows: 4,
      value: 'Survey the atmosphere before landing.',
    },
    [
      'Set rows for the initial height. resize controls native resizing.',
      'Use maxlength and minlength for length constraints. Preserve enough height when text is enlarged.',
    ],
  ),
  't-timeline': {
    purpose: 'Present an ordered history with visible dates and states.',
    usage: [
      'Items use id, title, and optional description/date/dateTime/status. The application controls ordering.',
      'date is visible text; dateTime is a machine-readable time. Use emptyText when there are no entries.',
    ],
    accessibility: [
      'Native ordered-list semantics preserve sequence. Keep status and dates in text rather than color alone.',
    ],
    example: {
      props: {
        label: 'Mission history',
        items: [
          { id: 'loaded', title: 'Configuration loaded', date: '09:41', status: 'Complete' },
          { id: 'ready', title: 'Awaiting command', status: 'Current' },
        ],
      },
    },
  },
  't-toast': {
    purpose: 'Announce a brief result without moving keyboard focus.',
    usage: [
      'Set message, then call show(). Notifications remain open by default. close() dismisses them programmatically.',
      'For optional auto-dismiss, set duration in milliseconds. countdown can be none, bar, or spinner; countdownUnit can be seconds or milliseconds.',
      'Hover, focus, and hidden pages pause the timer. Keep critical information persistent or available elsewhere.',
    ],
    accessibility: [
      'Routine messages use a polite live region. urgent requests immediate announcement.',
      'Countdown changes stay outside the live region. Motion preferences stop rotation and limit visual updates.',
    ],
    example: {
      props: { message: 'Settings saved.', variant: 'success', duration: 5000, countdown: 'bar' },
    },
    action: { label: 'Show notification', method: 'show' },
    event: {
      name: 't-close',
      read: 'detail.reason',
      description: 'detail.reason is dismiss, timeout, or programmatic.',
    },
  },
  't-toolbar': {
    purpose: 'Group related actions with a single keyboard entry point.',
    usage: [
      'Put buttons and links in the default slot. Use native separators for action groups.',
      'Use orientation="vertical" for vertical navigation. Keep text fields and other composite controls outside this toolbar.',
    ],
    accessibility: [
      'A roving tab stop supports arrows and Home/End. Give each toolbar a distinct label.',
    ],
    example: {
      props: { label: 'Archive actions' },
      children: [
        { tag: 't-button', children: ['Refresh'] },
        { tag: 't-button', props: { variant: 'secondary' }, children: ['Export'] },
      ],
    },
  },
  't-tooltip': {
    purpose: 'Offer short optional help from a named help button.',
    usage: [
      'Set label to name the built-in trigger and message to supply the help text.',
      'Opens on hover, focus, or click. Placement adapts near viewport edges. Use a popover for interactive content.',
    ],
    accessibility: [
      'Escape dismisses the tooltip. Pointer movement into the help content keeps it reachable.',
      'Keep essential instructions visible next to the relevant control.',
    ],
    example: {
      props: {
        label: 'About archive storage',
        message: 'Files stay in this workspace until you export them.',
      },
    },
  },
  't-tree': {
    purpose: 'Browse a hierarchy with expandable branches.',
    usage: [
      'Items use id, label, and optional children/disabled. Use unique IDs throughout the tree.',
      'value selects one item; expandedIds controls open branches. Replace arrays to update the hierarchy.',
    ],
    accessibility: [
      'Arrows, Home/End, typeahead, and sibling expansion support keyboard browsing.',
      'Provide an accessible tree label. Use simpler navigation when a hierarchy is unnecessary.',
    ],
    example: {
      props: {
        label: 'Project files',
        items: [
          {
            id: 'archive',
            label: 'Archive',
            children: [{ id: 'survey', label: 'Atmospheric survey' }],
          },
        ],
        expandedIds: ['archive'],
      },
    },
    event: selectEvent,
  },
};

// Shared slot guidance and one recipe still generate all four framework examples.
const startIcons: Record<string, string> = {
  't-button': 'check',
  't-link': 'file',
  't-badge': 'check',
  't-accordion': 'info',
  't-menu': 'more',
  't-popover': 'settings',
  't-input': 'user',
  't-password-input': 'info',
  't-select': 'folder',
  't-combobox': 'search',
};
for (const [tag, name] of Object.entries(startIcons)) {
  const guide = guides[tag];
  guide.example.children = [
    {
      tag: 't-icon',
      attrs: { slot: 'start' },
      props: { name, ...(tag === 't-badge' ? { size: 14 } : {}) },
    },
    ...(guide.example.children ?? []),
  ];
}
guides['t-number-input'].example.children = [
  { tag: 'span', attrs: { slot: 'end' }, children: ['crew'] },
];
for (const tag of [...Object.keys(startIcons), 't-number-input']) {
  const guide = guides[tag];
  const field = [
    't-input',
    't-password-input',
    't-number-input',
    't-select',
    't-combobox',
  ].includes(tag);
  guide.usage = [
    ...guide.usage,
    field
      ? 'Use start/end slots for icons, short affixes, or named actions. The control part styles the shared frame; disabled fields make their affix slots inert.'
      : 'Use start/end slots for non-interactive icons or short content beside the label. The slots follow text direction.',
  ];
  guide.accessibility = [
    ...guide.accessibility,
    field
      ? 'Keep the field label. Put essential units in label or help as well as the visual affix. Give each slotted action a name and keep value/event handling in your application.'
      : 'Keep meaningful text. Decorative t-icon children need no label. Do not nest interactive controls inside these slots.',
  ];
}
guides['t-badge'].usage.push('Content in the start slot replaces the default status dot.');
for (const tag of ['t-alert', 't-toast']) {
  const guide = guides[tag];
  guide.example.children = [
    { tag: 't-icon', attrs: { slot: 'icon' }, props: { name: 'check' } },
    ...(guide.example.children ?? []),
  ];
  guide.usage = [
    ...guide.usage,
    'Use the icon slot for a decorative status icon. Keep the message text to communicate meaning.',
  ];
}
guides['t-toast'].usage.push(
  'Use the actions slot for named actions outside the live message. Focus pauses auto-dismiss. Actions and icons are hidden when closed.',
);
