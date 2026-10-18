import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  template: `
    <div forTabs [(value)]="value">
      <div forTabsList aria-label="Account settings">
        @for (tab of tabs; track tab.value) {
          <button type="button" forTabsTrigger [value]="tab.value">{{ tab.label }}</button>
        }
      </div>
      @for (tab of tabs; track tab.value) {
        @if (value() === tab.value) {
          <div forTabsContent [value]="tab.value">
            <p>{{ tab.body }}</p>
          </div>
        }
      }
    </div>
    <output>{{ value() }}</output>
  `,
})
export class Scenario {
  protected readonly tabs = [
    { value: 'profile', label: 'Profile', body: 'Your public name, avatar and bio.' },
    { value: 'security', label: 'Security', body: 'Password and two-factor authentication.' },
    { value: 'billing', label: 'Billing', body: 'Plan, payment method and invoices.' },
  ];

  protected readonly value = signal<string | null>('profile');
}
