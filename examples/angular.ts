import '@angular/compiler';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TerminalValueAccessor } from '@terminal-kit/core/angular';
import '@terminal-kit/core/components/input';
import '@terminal-kit/core/components/button';
import '@terminal-kit/core/components/checkbox';
import '@terminal-kit/core/themes.css';
import './shared.css';
class AngularExample {
  name = new FormControl('Initial', { nonNullable: true });
  subscribed = new FormControl(false, { nonNullable: true });
  update() {
    this.name.setValue('Updated');
  }
  toggleDisabled() {
    this.name.disabled ? this.name.enable() : this.name.disable();
  }
  reset() {
    this.name.reset();
    this.subscribed.reset();
  }
}
Component({
  selector: 'angular-example',
  standalone: true,
  imports: [ReactiveFormsModule, TerminalValueAccessor],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template:
    '<h1>Angular reactive forms</h1><t-input label="Name" [formControl]="name"></t-input><t-button (click)="update()">Update from app</t-button><output>{{name.value}}</output><t-checkbox label="Subscribe" [formControl]="subscribed"></t-checkbox><span data-testid="checked">{{subscribed.value}}</span><t-button (click)="toggleDisabled()">Toggle disabled</t-button><t-button (click)="reset()">Reset from app</t-button><span data-testid="touched">{{name.touched}}</span>',
})(AngularExample);
bootstrapApplication(AngularExample).catch((error) => {
  console.error(error);
  document.querySelector('angular-example')!.textContent = 'Example failed to start.';
});
