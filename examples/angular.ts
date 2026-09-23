import '@angular/compiler';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TerminalInputValueAccessor } from './angular-value-accessor';
import '@terminal-kit/core/components/input';
import '@terminal-kit/core/components/button';
import '@terminal-kit/core/themes.css';
import './shared.css';
class AngularExample {
  name = new FormControl('Initial', { nonNullable: true });
  update() {
    this.name.setValue('Updated');
  }
}
Component({
  selector: 'angular-example',
  standalone: true,
  imports: [ReactiveFormsModule, TerminalInputValueAccessor],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template:
    '<h1>Angular reactive forms</h1><t-input label="Name" [formControl]="name"></t-input><t-button (click)="update()">Update from app</t-button><output>{{name.value}}</output>',
})(AngularExample);
bootstrapApplication(AngularExample).catch((error) => {
  console.error(error);
  document.querySelector('angular-example')!.textContent = 'Example failed to start.';
});
