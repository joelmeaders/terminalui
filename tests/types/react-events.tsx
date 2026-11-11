import type { ComponentProps } from 'react';
import type * as Barrel from '@joelmeaders/terminalui/react';
import { TAccordion } from '@joelmeaders/terminalui/react/accordion';
import { TAlert } from '@joelmeaders/terminalui/react/alert';
import { TCalendar } from '@joelmeaders/terminalui/react/calendar';
import { TChip } from '@joelmeaders/terminalui/react/chip';
import { TCommandPalette } from '@joelmeaders/terminalui/react/command-palette';
import { TCopyButton } from '@joelmeaders/terminalui/react/copy-button';
import { TDatePicker } from '@joelmeaders/terminalui/react/date-picker';
import { TDateRangePicker } from '@joelmeaders/terminalui/react/date-range-picker';
import { TDialog } from '@joelmeaders/terminalui/react/dialog';
import { TDrawer } from '@joelmeaders/terminalui/react/drawer';
import { TDock } from '@joelmeaders/terminalui/react/dock';
import { TPagination } from '@joelmeaders/terminalui/react/pagination';
import { TPasswordInput } from '@joelmeaders/terminalui/react/password-input';
import { TPopover } from '@joelmeaders/terminalui/react/popover';
import { TSplitPane } from '@joelmeaders/terminalui/react/split-pane';
import { TSteps } from '@joelmeaders/terminalui/react/steps';
import { TTable } from '@joelmeaders/terminalui/react/table';
import { TTabs } from '@joelmeaders/terminalui/react/tabs';
import { TTimePicker } from '@joelmeaders/terminalui/react/time-picker';
import { TToast } from '@joelmeaders/terminalui/react/toast';
import { TTree } from '@joelmeaders/terminalui/react/tree';
import { TMenu } from '@joelmeaders/terminalui/react/menu';
import type { TInput } from '@joelmeaders/terminalui/react/input';
import type { MenuOption } from '@joelmeaders/terminalui/components/menu';
import type { CommandItem } from '@joelmeaders/terminalui/components/command-palette';
import type { TreeItem } from '@joelmeaders/terminalui/components/tree';
import type { StepItem } from '@joelmeaders/terminalui/components/steps';
import type { SplitPaneChange } from '@joelmeaders/terminalui/components/split-pane';
import type { DockChange, DockEditChange } from '@joelmeaders/terminalui/components/dock';

// Equality detects unknown, any, widened unions, and missing payload fields.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;
type HandlerEvent<Props, Name extends keyof Props> =
  NonNullable<Props[Name]> extends (event: infer E) => void ? E : never;

export type CustomEventContracts = [
  Assert<Equal<HandlerEvent<ComponentProps<typeof TDock>, 'onTInput'>, CustomEvent<DockChange>>>,
  Assert<Equal<HandlerEvent<ComponentProps<typeof TDock>, 'onTChange'>, CustomEvent<DockChange>>>,
  Assert<Equal<HandlerEvent<ComponentProps<typeof TDock>, 'onTEdit'>, CustomEvent<DockEditChange>>>,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TAccordion>, 'onTToggle'>,
      CustomEvent<{ open: boolean }>
    >
  >,
  Assert<Equal<HandlerEvent<ComponentProps<typeof TAlert>, 'onTDismiss'>, CustomEvent<null>>>,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TCalendar>, 'onTChange'>,
      CustomEvent<{ value: string }>
    >
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TCalendar>, 'onTMonthChange'>,
      CustomEvent<{ month: string }>
    >
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TChip>, 'onTToggle'>,
      CustomEvent<{ selected: boolean; label: string }>
    >
  >,
  Assert<
    Equal<HandlerEvent<ComponentProps<typeof TChip>, 'onTRemove'>, CustomEvent<{ label: string }>>
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TCommandPalette>, 'onTSelect'>,
      CustomEvent<{ value: string; command: CommandItem }>
    >
  >,
  Assert<
    Equal<HandlerEvent<ComponentProps<typeof TCommandPalette>, 'onTClose'>, CustomEvent<null>>
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TCopyButton>, 'onTCopy'>,
      CustomEvent<{ value: string }>
    >
  >,
  Assert<
    Equal<HandlerEvent<ComponentProps<typeof TCopyButton>, 'onTCopyError'>, CustomEvent<null>>
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TDatePicker>, 'onTChange'>,
      CustomEvent<{ value: string }>
    >
  >,
  Assert<Equal<HandlerEvent<ComponentProps<typeof TDatePicker>, 'onTClose'>, CustomEvent<null>>>,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TDateRangePicker>, 'onTChange'>,
      CustomEvent<{ start: string; end: string; value: string }>
    >
  >,
  Assert<
    Equal<HandlerEvent<ComponentProps<typeof TDateRangePicker>, 'onTClose'>, CustomEvent<null>>
  >,
  Assert<Equal<HandlerEvent<ComponentProps<typeof TDialog>, 'onTClose'>, CustomEvent<null>>>,
  Assert<Equal<HandlerEvent<ComponentProps<typeof TDrawer>, 'onTClose'>, CustomEvent<null>>>,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TPagination>, 'onTChange'>,
      CustomEvent<{ page: number; pageSize: number }>
    >
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TPasswordInput>, 'onTVisibilityChange'>,
      CustomEvent<{ revealed: boolean }>
    >
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TPopover>, 'onTToggle'>,
      CustomEvent<{ open: boolean }>
    >
  >,
  Assert<
    Equal<HandlerEvent<ComponentProps<typeof TSplitPane>, 'onTInput'>, CustomEvent<SplitPaneChange>>
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TSplitPane>, 'onTChange'>,
      CustomEvent<SplitPaneChange>
    >
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TSteps>, 'onTSelect'>,
      CustomEvent<{ value: string; index: number; step: StepItem }>
    >
  >,
  Assert<
    Equal<HandlerEvent<ComponentProps<typeof TTable>, 'onTFilter'>, CustomEvent<{ query: string }>>
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TTable>, 'onTSort'>,
      CustomEvent<{ key: string; direction: 'ascending' | 'descending' }>
    >
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TTable>, 'onTPageChange'>,
      CustomEvent<{ page: number; pageSize: number }>
    >
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TTable>, 'onTSelectionChange'>,
      CustomEvent<{ selectedKeys: (string | number)[] }>
    >
  >,
  Assert<
    Equal<HandlerEvent<ComponentProps<typeof TTabs>, 'onTChange'>, CustomEvent<{ value: string }>>
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TTimePicker>, 'onTChange'>,
      CustomEvent<{ value: string }>
    >
  >,
  Assert<Equal<HandlerEvent<ComponentProps<typeof TTimePicker>, 'onTClose'>, CustomEvent<null>>>,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TToast>, 'onTClose'>,
      CustomEvent<{ reason: 'dismiss' | 'timeout' | 'programmatic' }>
    >
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TTree>, 'onTSelect'>,
      CustomEvent<{ value: string; item: TreeItem }>
    >
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TTree>, 'onTToggle'>,
      CustomEvent<{ id: string; expanded: boolean; expandedIds: string[] }>
    >
  >,
  Assert<
    Equal<
      HandlerEvent<ComponentProps<typeof TMenu>, 'onTSelect'>,
      CustomEvent<{ value: string; option: MenuOption }>
    >
  >,
];

export type BarrelCompatibility = [
  Assert<Equal<ComponentProps<typeof TDock>, ComponentProps<typeof Barrel.TDock>>>,
  Assert<Equal<ComponentProps<typeof TAccordion>, ComponentProps<typeof Barrel.TAccordion>>>,
  Assert<Equal<ComponentProps<typeof TAlert>, ComponentProps<typeof Barrel.TAlert>>>,
  Assert<Equal<ComponentProps<typeof TCalendar>, ComponentProps<typeof Barrel.TCalendar>>>,
  Assert<Equal<ComponentProps<typeof TChip>, ComponentProps<typeof Barrel.TChip>>>,
  Assert<
    Equal<ComponentProps<typeof TCommandPalette>, ComponentProps<typeof Barrel.TCommandPalette>>
  >,
  Assert<Equal<ComponentProps<typeof TCopyButton>, ComponentProps<typeof Barrel.TCopyButton>>>,
  Assert<Equal<ComponentProps<typeof TDatePicker>, ComponentProps<typeof Barrel.TDatePicker>>>,
  Assert<
    Equal<ComponentProps<typeof TDateRangePicker>, ComponentProps<typeof Barrel.TDateRangePicker>>
  >,
  Assert<Equal<ComponentProps<typeof TDialog>, ComponentProps<typeof Barrel.TDialog>>>,
  Assert<Equal<ComponentProps<typeof TDrawer>, ComponentProps<typeof Barrel.TDrawer>>>,
  Assert<Equal<ComponentProps<typeof TPagination>, ComponentProps<typeof Barrel.TPagination>>>,
  Assert<
    Equal<ComponentProps<typeof TPasswordInput>, ComponentProps<typeof Barrel.TPasswordInput>>
  >,
  Assert<Equal<ComponentProps<typeof TPopover>, ComponentProps<typeof Barrel.TPopover>>>,
  Assert<Equal<ComponentProps<typeof TSplitPane>, ComponentProps<typeof Barrel.TSplitPane>>>,
  Assert<Equal<ComponentProps<typeof TSteps>, ComponentProps<typeof Barrel.TSteps>>>,
  Assert<Equal<ComponentProps<typeof TTable>, ComponentProps<typeof Barrel.TTable>>>,
  Assert<Equal<ComponentProps<typeof TTabs>, ComponentProps<typeof Barrel.TTabs>>>,
  Assert<Equal<ComponentProps<typeof TTimePicker>, ComponentProps<typeof Barrel.TTimePicker>>>,
  Assert<Equal<ComponentProps<typeof TToast>, ComponentProps<typeof Barrel.TToast>>>,
  Assert<Equal<ComponentProps<typeof TTree>, ComponentProps<typeof Barrel.TTree>>>,
  Assert<Equal<ComponentProps<typeof TMenu>, ComponentProps<typeof Barrel.TMenu>>>,
];

export type NativeEventContracts = [
  Assert<Equal<HandlerEvent<ComponentProps<typeof TInput>, 'onInput'>, Event>>,
  Assert<Equal<HandlerEvent<ComponentProps<typeof TInput>, 'onChange'>, Event>>,
  Assert<
    ((event: CustomEvent<unknown>) => void) extends NonNullable<
      ComponentProps<typeof TMenu>['onTSelect']
    >
      ? true
      : false
  >,
];

export function TypedMenuExample() {
  return (
    <TMenu
      label="File actions"
      options={[{ value: 'open', label: 'Open' }]}
      onTSelect={(event) => {
        const value: string = event.detail.value;
        const option: MenuOption = event.detail.option;
        // @ts-expect-error: Event details must reject misspelled payload fields.
        void event.detail.misspelled;
        return option.label + value;
      }}
    />
  );
}
