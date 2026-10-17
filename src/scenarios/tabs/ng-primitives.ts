import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgpTabButton, NgpTabList, NgpTabPanel, NgpTabset } from 'ng-primitives/tabs';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgpTabset, NgpTabList, NgpTabButton, NgpTabPanel],
  template: `
    <div ngpTabset ngpTabsetActivateOnFocus [(ngpTabsetValue)]="value">
      <div ngpTabList aria-label="Account settings">
        @for (tab of tabs; track tab.value) {
          <button type="button" ngpTabButton [ngpTabButtonValue]="tab.value">
            {{ tab.label }}
          </button>
        }
      </div>
      @for (tab of tabs; track tab.value) {
        <div ngpTabPanel [ngpTabPanelValue]="tab.value" [hidden]="value() !== tab.value">
          <p>{{ tab.body }}</p>
        </div>
      }
    </div>
    <output>{{ value() ?? '' }}</output>
  `,
})
export class Scenario {
  protected readonly tabs = [
    { value: 'profile', label: 'Profile', body: 'Your public name, avatar and bio.' },
    { value: 'security', label: 'Security', body: 'Password and two-factor authentication.' },
    { value: 'billing', label: 'Billing', body: 'Plan, payment method and invoices.' },
  ];

  protected readonly value = signal<string | undefined>('profile');
}
