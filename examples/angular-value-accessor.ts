import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import type { TInput } from '../src';

/** Example adapter for t-input. Keep Angular dependencies outside the core package. */
export class TerminalInputValueAccessor implements ControlValueAccessor {
  private element = inject<ElementRef<TInput>>(ElementRef);
  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};
  writeValue(value: string | null) {
    this.element.nativeElement.value = value ?? '';
  }
  registerOnChange(callback: (value: string) => void) {
    this.onChange = callback;
  }
  registerOnTouched(callback: () => void) {
    this.onTouched = callback;
  }
  setDisabledState(disabled: boolean) {
    this.element.nativeElement.disabled = disabled;
  }
  input(event: Event) {
    this.onChange((event.target as TInput).value);
  }
}
// Decorator function syntax keeps this small JIT example compatible with Vite.
Directive({
  selector: 't-input[formControl]',
  standalone: true,
  host: { '(input)': 'input($event)', '(focusout)': 'onTouched()' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TerminalInputValueAccessor),
      multi: true,
    },
  ],
})(TerminalInputValueAccessor);
