import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

type TerminalControl = HTMLElement & {
  value: string;
  disabled: boolean;
  checked?: boolean;
  files?: FileList | null;
};

/** Angular reactive and template-driven forms adapter for Terminal Kit controls. */
@Directive({
  selector:
    't-input[formControl],t-input[formControlName],t-input[ngModel],t-textarea[formControl],t-textarea[formControlName],t-textarea[ngModel],t-select[formControl],t-select[formControlName],t-select[ngModel],t-checkbox[formControl],t-checkbox[formControlName],t-checkbox[ngModel],t-switch[formControl],t-switch[formControlName],t-switch[ngModel],t-range[formControl],t-range[formControlName],t-range[ngModel],t-radio-group[formControl],t-radio-group[formControlName],t-radio-group[ngModel],t-combobox[formControl],t-combobox[formControlName],t-combobox[ngModel],t-file-input[formControl],t-file-input[formControlName],t-file-input[ngModel]',
  standalone: true,
  host: { '(input)': 'input()', '(focusout)': 'onTouched()' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TerminalValueAccessor),
      multi: true,
    },
  ],
})
export class TerminalValueAccessor implements ControlValueAccessor {
  private readonly element = inject<ElementRef<TerminalControl>>(ElementRef);
  private onChange: (value: unknown) => void = () => {};
  onTouched: () => void = () => {};
  private get property(): 'value' | 'checked' | 'files' {
    const tag = this.element.nativeElement.localName;
    return tag === 't-file-input'
      ? 'files'
      : tag === 't-checkbox' || tag === 't-switch'
        ? 'checked'
        : 'value';
  }
  writeValue(value: unknown): void {
    const control = this.element.nativeElement;
    if (this.property === 'checked') control.checked = Boolean(value);
    else if (this.property === 'files') control.files = value instanceof FileList ? value : null;
    else control.value = value == null ? '' : String(value);
  }
  registerOnChange(callback: (value: unknown) => void): void {
    this.onChange = callback;
  }
  registerOnTouched(callback: () => void): void {
    this.onTouched = callback;
  }
  setDisabledState(disabled: boolean): void {
    this.element.nativeElement.disabled = disabled;
  }
  input(): void {
    this.onChange(this.element.nativeElement[this.property]);
  }
}
